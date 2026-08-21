import { Inject, Injectable, Logger } from '@nestjs/common';
import { ZodError } from 'zod';
import { PrismaService } from '../database/prisma.service';
import { ChatAccessService } from './chat-access.service';
import type { ListChatMessagesQueryDto, ParsedItem } from './dto/chat.dto';
import {
  LLM_PROVIDER,
  type CatalogEntry,
  type LlmProvider,
} from './llm/llm.port';

const PENDING_TTL_MINUTES = 15;
const CONFIRM_KEYWORDS = ['ยืนยัน', 'confirm', 'ตกลง', 'ใช่'];
const CANCEL_KEYWORDS = ['ยกเลิก', 'cancel', 'ไม่'];

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatAccess: ChatAccessService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
  ) {}

  async listMessages(
    userId: string,
    shopId: string,
    query: ListChatMessagesQueryDto,
  ) {
    const ctx = await this.chatAccess.assertCanViewChat(userId, shopId);

    return this.prisma.chatMessage.findMany({
      where: { shopId, userId: ctx.userId },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });
  }

  async sendMessage(userId: string, shopId: string, content: string) {
    const ctx = await this.chatAccess.assertCanUseChatbot(userId, shopId);
    const normalized = content.trim().toLowerCase();

    await this.prisma.chatMessage.create({
      data: {
        shopId,
        userId: ctx.userId,
        channel: 'WEB',
        role: 'USER',
        content,
      },
    });

    if (CONFIRM_KEYWORDS.some((k) => normalized === k)) {
      return this.confirmLatestPending(ctx.userId, shopId);
    }

    if (CANCEL_KEYWORDS.some((k) => normalized === k)) {
      return this.cancelLatestPending(ctx.userId, shopId);
    }

    return this.parseAndStage(ctx.userId, shopId, content);
  }

  private async parseAndStage(userId: string, shopId: string, rawText: string) {
    const catalog = await this.loadCatalog(shopId);

    let items: ParsedItem[] = [];
    let errorReason: string | null = null;

    try {
      const result = await this.llm.parseStockCommand(rawText, catalog);
      const allowed = new Set(catalog.map((c) => c.shopProductId));
      items = result.items.filter(
        (item) => allowed.has(item.shopProductId) && item.qtyChange !== 0,
      );

      if (items.length === 0) {
        errorReason = 'ไม่พบสินค้าที่ตรงกับคำสั่ง หรือไม่ได้ระบุจำนวน';
      }
    } catch (error) {
      this.logger.error(
        `parseStockCommand failed (shop=${shopId}): ${String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      errorReason =
        error instanceof ZodError
          ? 'AI ตอบกลับในรูปแบบที่ระบบอ่านไม่ได้'
          : 'ตีความคำสั่งไม่สำเร็จ กรุณาลองพิมพ์ใหม่';
    }

    const failed = errorReason !== null;
    const expiresAt = new Date(Date.now() + PENDING_TTL_MINUTES * 60 * 1000);

    const pending = await this.prisma.pendingStockAction.create({
      data: {
        shopId,
        userId,
        channel: 'WEB',
        rawText,
        parsedItems: items,
        status: failed ? 'FAILED' : 'PENDING',
        errorReason,
        expiresAt,
      },
    });

    const reply = failed
      ? `❌ ${errorReason}`
      : this.buildSummary(items) +
        '\n\nพิมพ์ "ยืนยัน" เพื่อบันทึก หรือ "ยกเลิก" เพื่อยกเลิก';

    await this.prisma.chatMessage.create({
      data: {
        shopId,
        userId,
        channel: 'WEB',
        role: 'ASSISTANT',
        content: reply,
        pendingActionId: pending.id,
      },
    });

    return { pendingAction: pending, reply };
  }

  private async confirmLatestPending(userId: string, shopId: string) {
    const pending = await this.findLatestPending(userId, shopId);

    if (!pending) {
      return this.replyOnly(userId, shopId, 'ไม่มีรายการที่รอยืนยันอยู่');
    }

    if (pending.expiresAt.getTime() <= Date.now()) {
      await this.prisma.pendingStockAction.update({
        where: { id: pending.id },
        data: { status: 'EXPIRED' },
      });

      return this.replyOnly(
        userId,
        shopId,
        'รายการนี้หมดอายุแล้ว กรุณาพิมพ์คำสั่งใหม่อีกครั้ง',
      );
    }

    // TODO(stock-movements): เมื่อ feature/stock-movements-resource (พี่ดิว) เข้า dev
    // ต้องเขียน stock_movements + อัปเดต shop_products.stock_qty ในทรานแซกชันเดียวกับ
    // การ mark CONFIRMED ตรงนี้ ตอนนี้ยังไม่มีตารางนั้น สต็อกจึงยังไม่ถูกตัดจริง
    const confirmed = await this.prisma.pendingStockAction.update({
      where: { id: pending.id },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });

    const items = pending.parsedItems as unknown as ParsedItem[];
    const reply = `✅ ยืนยันแล้ว\n${this.buildSummary(items)}\n\n(หมายเหตุ: ยังไม่ตัดสต็อกจริง รอระบบ stock movements)`;

    await this.prisma.chatMessage.create({
      data: {
        shopId,
        userId,
        channel: 'WEB',
        role: 'ASSISTANT',
        content: reply,
        pendingActionId: confirmed.id,
      },
    });

    return { pendingAction: confirmed, reply };
  }

  private async cancelLatestPending(userId: string, shopId: string) {
    const pending = await this.findLatestPending(userId, shopId);

    if (!pending) {
      return this.replyOnly(userId, shopId, 'ไม่มีรายการที่รอยืนยันอยู่');
    }

    const cancelled = await this.prisma.pendingStockAction.update({
      where: { id: pending.id },
      data: { status: 'CANCELLED' },
    });

    const reply = 'ยกเลิกรายการแล้ว';

    await this.prisma.chatMessage.create({
      data: {
        shopId,
        userId,
        channel: 'WEB',
        role: 'ASSISTANT',
        content: reply,
        pendingActionId: cancelled.id,
      },
    });

    return { pendingAction: cancelled, reply };
  }

  private findLatestPending(userId: string, shopId: string) {
    return this.prisma.pendingStockAction.findFirst({
      where: { userId, shopId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async replyOnly(userId: string, shopId: string, reply: string) {
    await this.prisma.chatMessage.create({
      data: {
        shopId,
        userId,
        channel: 'WEB',
        role: 'ASSISTANT',
        content: reply,
      },
    });

    return { pendingAction: null, reply };
  }

  private async loadCatalog(shopId: string): Promise<CatalogEntry[]> {
    const rows = await this.prisma.shopProduct.findMany({
      where: { shopId, status: 'ACTIVE', product: { deletedAt: null } },
      select: {
        id: true,
        product: { select: { name: true, unit: true } },
      },
    });

    return rows.map((row) => ({
      shopProductId: row.id,
      productName: row.product.name,
      unit: row.product.unit,
    }));
  }

  private buildSummary(items: ParsedItem[]): string {
    return items
      .map(
        (item) =>
          `• ${item.productName} ${item.qtyChange > 0 ? '+' : ''}${item.qtyChange}`,
      )
      .join('\n');
  }
}

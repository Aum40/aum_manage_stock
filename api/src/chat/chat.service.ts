import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ChatCommandService } from '../chat-command/chat-command.service';
import { StockChoiceService } from '../chat-command/stock-choice.service';
import { PrismaService } from '../database/prisma.service';
import { ChatAccessService } from './chat-access.service';
import type {
  ApplyChatCommandDto,
  ListChatMessagesQueryDto,
  SelectChatProductDto,
} from './dto/chat.dto';

/**
 * คำทักทาย/ขอความช่วยเหลือ — ชุดเดียวกับฝั่ง LINE (line-webhook.service.ts)
 * เพื่อให้สองช่องทางตอบเหมือนกัน
 */
const HELP_KEYWORDS = [
  'สวัสดี',
  'สวัสดีครับ',
  'สวัสดีค่ะ',
  'หวัดดี',
  'hello',
  'hi',
  'ช่วยเหลือ',
  'help',
  'เมนู',
  'menu',
  'วิธีใช้',
];

const HELP_TEXT = [
  'ผมช่วยปรับสต็อกสินค้าให้ได้ครับ พิมพ์เป็นภาษาพูดได้เลย',
  '',
  'ตัวอย่าง',
  '• เพิ่มโค้ก 10',
  '• ลดน้ำเปล่า 5',
  '',
  'ผมจะสรุปให้ดูก่อน แล้วกดยืนยันเพื่อบันทึก หรือกดยกเลิกได้',
].join('\n');

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatAccess: ChatAccessService,
    private readonly chatCommand: ChatCommandService,
    private readonly stockChoice: StockChoiceService,
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

    await this.prisma.chatMessage.create({
      data: {
        shopId,
        userId: ctx.userId,
        channel: 'WEB',
        role: 'USER',
        content,
      },
    });

    // ทักทาย/ขอวิธีใช้ ไม่ใช่คำสั่งสต็อก ตอบวิธีใช้ไปเลยดีกว่าปล่อยให้ parser
    // ล้มแล้วขึ้นเป็น error ทั้งที่ผู้ใช้ไม่ได้ทำอะไรผิด
    if (HELP_KEYWORDS.includes(content.trim().toLowerCase())) {
      await this.prisma.chatMessage.create({
        data: {
          shopId,
          userId: ctx.userId,
          channel: 'WEB',
          role: 'ASSISTANT',
          content: HELP_TEXT,
        },
      });

      return { pendingAction: null, reply: HELP_TEXT, candidates: [] };
    }

    try {
      const pending = await this.chatCommand.create({
        shopId,
        actorId: ctx.userId,
        source: 'WEB',
        message: content,
      });

      const reply = this.buildSummary(
        pending.operation,
        pending.quantity,
        pending.productQuery,
      );

      await this.prisma.chatMessage.create({
        data: {
          shopId,
          userId: ctx.userId,
          channel: 'WEB',
          role: 'ASSISTANT',
          content: reply,
          pendingActionId: pending.id,
        },
      });

      return { pendingAction: pending, reply, candidates: [] };
    } catch (error) {
      /**
       * ชื่อกำกวม = แมตช์ได้หลายตัว ให้ผู้ใช้เลือกจากรายการแทนการเดาให้
       * ฝั่ง LINE ให้พิมพ์หมายเลข ส่วนเว็บเอา candidates ไปวาดเป็นปุ่ม
       */
      if (error instanceof ConflictException) {
        const pending = await this.stockChoice.createChoicePending({
          shopId,
          actorId: ctx.userId,
          source: 'WEB',
          message: content,
        });

        if (pending) {
          const { candidates } = this.stockChoice.readChoicePayload(
            pending.payload,
          );
          const reply = this.stockChoice.renderChoices(pending);

          await this.prisma.chatMessage.create({
            data: {
              shopId,
              userId: ctx.userId,
              channel: 'WEB',
              role: 'ASSISTANT',
              content: reply,
              pendingActionId: pending.id,
            },
          });

          return { pendingAction: pending, reply, candidates };
        }
      }

      this.logger.warn(
        `chat command failed (shop=${shopId}): ${String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      const reply = this.buildErrorReply(error, content);

      await this.prisma.chatMessage.create({
        data: {
          shopId,
          userId: ctx.userId,
          channel: 'WEB',
          role: 'ASSISTANT',
          content: reply,
        },
      });

      return { pendingAction: null, reply, candidates: [] };
    }
  }

  /**
   * ผู้ใช้เลือกสินค้าแล้ว — เติม shopProductId ให้รายการที่ค้างอยู่ แล้วบันทึก
   * ข้อความตอบกลับของบอทลงประวัติแชทด้วย
   *
   * ถ้าไม่บันทึกข้อความ ประวัติแชทจะจบลงที่รายการตัวเลือกเฉยๆ ผู้ใช้เปิดหน้ามา
   * ใหม่จะไม่รู้ว่าตัวเองเลือกอะไรไปแล้ว และไม่รู้ว่าเหลือแค่กดยืนยัน
   */
  async selectProduct(
    userId: string,
    shopId: string,
    dto: SelectChatProductDto,
  ) {
    const ctx = await this.chatAccess.assertCanUseChatbot(userId, shopId);

    const pending = await this.chatCommand.update(
      shopId,
      dto.pendingActionId,
      ctx.userId,
      { shopProductId: dto.shopProductId },
    );

    // ใช้ชื่อสินค้าจริงที่เลือก ไม่ใช่คำที่ผู้ใช้พิมพ์มา ผู้ใช้จะได้เห็นชัดว่า
    // ระบบเข้าใจตรงกับที่ตั้งใจ
    const chosen = await this.prisma.shopProduct.findFirst({
      where: { id: dto.shopProductId, shopId },
      select: { product: { select: { name: true } } },
    });

    const reply = this.buildSummary(
      pending.operation,
      pending.quantity,
      chosen?.product.name ?? pending.productQuery,
    );

    await this.prisma.chatMessage.create({
      data: {
        shopId,
        userId: ctx.userId,
        channel: 'WEB',
        role: 'ASSISTANT',
        content: reply,
        pendingActionId: pending.id,
      },
    });

    return { pendingAction: pending, reply, candidates: [] };
  }

  /**
   * ยืนยันหรือยกเลิกรายการที่ค้างอยู่ แล้วบันทึกคำตอบของบอทลงประวัติแชท
   *
   * ตอนยืนยันจะบอกจำนวนก่อน→หลังไปด้วย เพราะเป็นจุดเดียวที่สต็อกเปลี่ยนจริง
   * ผู้ใช้ควรเห็นตัวเลขยืนยันทันทีโดยไม่ต้องไปเปิดหน้าสินค้าเช็คเอง
   */
  async applyCommand(userId: string, shopId: string, dto: ApplyChatCommandDto) {
    const ctx = await this.chatAccess.assertCanUseChatbot(userId, shopId);

    const pending = await this.prisma.pendingAction.findFirst({
      where: { id: dto.pendingActionId, shopId },
      select: { productQuery: true, shopProductId: true },
    });

    const productName = pending?.shopProductId
      ? (
          await this.prisma.shopProduct.findFirst({
            where: { id: pending.shopProductId, shopId },
            select: { product: { select: { name: true } } },
          })
        )?.product.name
      : undefined;

    const label = productName ?? pending?.productQuery ?? '';

    if (dto.action === 'CANCEL') {
      await this.chatCommand.cancel(shopId, dto.pendingActionId, ctx.userId);

      const reply = `ยกเลิกรายการแล้ว${label ? ` — ${label}` : ''}`;
      await this.recordAssistant(shopId, ctx.userId, reply);

      return { pendingAction: null, reply, candidates: [] };
    }

    const result = await this.chatCommand.confirm(
      shopId,
      dto.pendingActionId,
      ctx.userId,
    );

    const stock = (
      result as { stock?: { quantityBefore: number; quantityAfter: number } }
    ).stock;
    const range = stock
      ? ` (${stock.quantityBefore} → ${stock.quantityAfter})`
      : '';
    const sign =
      stock && stock.quantityAfter >= stock.quantityBefore ? '+' : '-';
    const delta = stock
      ? Math.abs(stock.quantityAfter - stock.quantityBefore)
      : 0;

    const reply = ['✅ ยืนยันแล้ว', `• ${label} ${sign}${delta}${range}`].join(
      '\n',
    );

    await this.recordAssistant(shopId, ctx.userId, reply);

    return { pendingAction: null, reply, candidates: [] };
  }

  private async recordAssistant(
    shopId: string,
    userId: string,
    content: string,
    pendingActionId?: string,
  ) {
    await this.prisma.chatMessage.create({
      data: {
        shopId,
        userId,
        channel: 'WEB',
        role: 'ASSISTANT',
        content,
        pendingActionId,
      },
    });
  }

  private buildSummary(
    operation: 'INCREASE' | 'DECREASE',
    quantity: number,
    productQuery: string,
  ): string {
    const sign = operation === 'INCREASE' ? '+' : '-';

    return [
      `• ${productQuery} ${sign}${quantity}`,
      '',
      'กดยืนยันเพื่อบันทึก หรือกดยกเลิกเพื่อยกเลิก',
    ].join('\n');
  }

  /**
   * แปลง exception เป็นข้อความไทย ให้ตรงกับที่ฝั่ง LINE ตอบ
   *
   * เดิมส่งข้อความดิบของ exception ออกไปตรงๆ ผู้ใช้จึงเห็นภาษาอังกฤษอย่าง
   * "Shop product not found" ซึ่งอ่านไม่รู้เรื่องและไม่บอกว่าต้องทำอะไรต่อ
   */
  private buildErrorReply(error: unknown, message: string): string {
    if (error instanceof NotFoundException) {
      return `ไม่พบสินค้าที่ตรงกับ "${message}" ในร้าน กรุณาตรวจสอบชื่อสินค้าแล้วลองใหม่`;
    }

    // ชื่อกำกวมเกิดง่ายเมื่อสินค้าเยอะขึ้น เพราะค้นแบบ "มีคำนี้อยู่ในชื่อ"
    if (error instanceof ConflictException) {
      return `มีสินค้าหลายรายการที่ตรงกับ "${message}" กรุณาพิมพ์ชื่อให้เจาะจงขึ้น หรือใช้บาร์โค้ดแทน`;
    }

    // แพ็กเกจไม่รองรับ / พนักงานไม่มีสิทธิ์ / แพ็กเกจหมดอายุ
    if (error instanceof ForbiddenException) {
      const detail = error.getResponse() as { message?: string } | string;
      const text =
        typeof detail === 'string' ? detail : (detail?.message ?? '');

      if (text.includes('does not include chatbot')) {
        return 'แพ็กเกจของคุณยังไม่รองรับแชทบอท กรุณาอัปเกรดเป็น Plus หรือ Pro';
      }
      if (text.includes('read-only')) {
        return 'แพ็กเกจหมดอายุแล้ว ตอนนี้ดูข้อมูลได้อย่างเดียว กรุณาต่ออายุก่อนปรับสต็อก';
      }

      return 'คุณไม่มีสิทธิ์ใช้แชทบอทในร้านนี้';
    }

    if (error instanceof BadRequestException) {
      return `ไม่เข้าใจคำสั่ง "${message}" ครับ\n\n${HELP_TEXT}`;
    }

    return 'ตีความคำสั่งไม่สำเร็จ กรุณาลองพิมพ์ใหม่ เช่น "เพิ่มโค้ก 10"';
  }
}

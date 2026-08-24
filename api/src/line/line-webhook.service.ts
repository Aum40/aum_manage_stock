import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { ChatCommandService } from '../chat-command/chat-command.service';
import { PrismaService } from '../database/prisma.service';
import { LineReplyService } from './line-reply.service';
import { LineUserMessageError } from './line-user-message.error';
import { LINE_IDENTITY_PORT } from './ports/line-identity.port';
import type { LineIdentityPort } from './ports/line-identity.port';

const lineWebhookSchema = z.object({
  destination: z.string().min(1),
  events: z.array(
    z.object({
      type: z.string(),
      replyToken: z.string().optional(),
      source: z.object({ userId: z.string().optional() }).passthrough(),
      message: z
        .object({ type: z.string(), text: z.string().optional() })
        .optional(),
    }),
  ),
});

const CONFIRM_KEYWORDS = ['ยืนยัน', 'confirm', 'ตกลง', 'ใช่'];
const CANCEL_KEYWORDS = ['ยกเลิก', 'cancel', 'ไม่'];

@Injectable()
export class LineWebhookService {
  private readonly logger = new Logger(LineWebhookService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly commands: ChatCommandService,
    private readonly prisma: PrismaService,
    private readonly reply: LineReplyService,
    @Inject(LINE_IDENTITY_PORT)
    private readonly identity: LineIdentityPort,
  ) {}

  async handle(rawBody: Buffer, signature: string | undefined) {
    this.verifySignature(rawBody, signature);
    const payload = lineWebhookSchema.parse(
      JSON.parse(rawBody.toString('utf8')),
    );
    const results: Array<{ pendingActionId?: string }> = [];

    for (const event of payload.events) {
      if (
        event.type !== 'message' ||
        event.message?.type !== 'text' ||
        !event.message.text ||
        !event.source.userId
      ) {
        continue;
      }

      results.push(
        await this.handleTextEvent({
          destination: payload.destination,
          lineUserId: event.source.userId,
          text: event.message.text,
          replyToken: event.replyToken,
        }),
      );
    }

    // LINE จะยิงซ้ำถ้าไม่ได้ 2xx จึงต้องตอบ accepted เสมอแม้บางเหตุการณ์จะล้มเหลว
    return { accepted: true, results };
  }

  private async handleTextEvent(input: {
    destination: string;
    lineUserId: string;
    text: string;
    replyToken?: string;
  }): Promise<{ pendingActionId?: string }> {
    try {
      const identity = await this.identity.resolve({
        destination: input.destination,
        lineUserId: input.lineUserId,
        message: input.text,
      });
      const actorId = identity.actorId;

      if (!actorId) {
        throw new LineUserMessageError(
          'ไม่สามารถระบุผู้ใช้ได้ กรุณาติดต่อผู้ดูแลระบบ',
        );
      }

      const normalized = identity.message.trim().toLowerCase();

      await this.record(identity.shopId, actorId, 'USER', input.text);

      if (CONFIRM_KEYWORDS.includes(normalized)) {
        return await this.confirmLatest(
          identity.shopId,
          actorId,
          input.replyToken,
        );
      }

      if (CANCEL_KEYWORDS.includes(normalized)) {
        return await this.cancelLatest(
          identity.shopId,
          actorId,
          input.replyToken,
        );
      }

      const pending = await this.commands.create({
        shopId: identity.shopId,
        actorId,
        source: 'LINE',
        message: identity.message,
      });

      const summary = [
        `• ${pending.productQuery} ${pending.operation === 'INCREASE' ? '+' : '-'}${pending.quantity}`,
        '',
        'พิมพ์ "ยืนยัน" เพื่อบันทึก หรือ "ยกเลิก" เพื่อยกเลิก',
      ].join('\n');

      await this.respond(
        identity.shopId,
        actorId,
        input.replyToken,
        summary,
        pending.id,
      );

      return { pendingActionId: pending.id };
    } catch (error) {
      await this.replyWithError(input.replyToken, error);

      return {};
    }
  }

  private async confirmLatest(
    shopId: string,
    actorId: string,
    replyToken?: string,
  ): Promise<{ pendingActionId?: string }> {
    const pending = await this.findLatestPending(shopId, actorId);

    if (!pending) {
      await this.respond(
        shopId,
        actorId,
        replyToken,
        'ไม่มีรายการที่รอยืนยันอยู่',
      );

      return {};
    }

    await this.commands.confirm(shopId, pending.id, actorId);
    await this.respond(
      shopId,
      actorId,
      replyToken,
      `✅ ยืนยันแล้ว\n• ${pending.productQuery} ${pending.operation === 'INCREASE' ? '+' : '-'}${pending.quantity}`,
      pending.id,
    );

    return { pendingActionId: pending.id };
  }

  private async cancelLatest(
    shopId: string,
    actorId: string,
    replyToken?: string,
  ): Promise<{ pendingActionId?: string }> {
    const pending = await this.findLatestPending(shopId, actorId);

    if (!pending) {
      await this.respond(
        shopId,
        actorId,
        replyToken,
        'ไม่มีรายการที่รอยืนยันอยู่',
      );

      return {};
    }

    await this.commands.cancel(shopId, pending.id, actorId);
    await this.respond(
      shopId,
      actorId,
      replyToken,
      'ยกเลิกรายการแล้ว',
      pending.id,
    );

    return { pendingActionId: pending.id };
  }

  private findLatestPending(shopId: string, actorId: string) {
    return this.prisma.pendingAction.findFirst({
      where: { shopId, actorId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async respond(
    shopId: string,
    actorId: string,
    replyToken: string | undefined,
    text: string,
    pendingActionId?: string,
  ): Promise<void> {
    await this.record(shopId, actorId, 'ASSISTANT', text, pendingActionId);

    if (replyToken) await this.reply.reply(replyToken, text);
  }

  private async replyWithError(
    replyToken: string | undefined,
    error: unknown,
  ): Promise<void> {
    const text =
      error instanceof LineUserMessageError
        ? error.message
        : 'ตีความคำสั่งไม่สำเร็จ กรุณาลองพิมพ์ใหม่ เช่น "เพิ่มโค้ก 10"';

    if (!(error instanceof LineUserMessageError)) {
      this.logger.error(
        `LINE event failed: ${String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    if (replyToken) await this.reply.reply(replyToken, text);
  }

  private async record(
    shopId: string,
    userId: string,
    role: 'USER' | 'ASSISTANT',
    content: string,
    pendingActionId?: string,
  ): Promise<void> {
    await this.prisma.chatMessage.create({
      data: { shopId, userId, channel: 'LINE', role, content, pendingActionId },
    });
  }

  private verifySignature(
    rawBody: Buffer,
    signature: string | undefined,
  ): void {
    const secret = this.config.get<string>('LINE_CHANNEL_SECRET');
    if (!secret) {
      throw new ServiceUnavailableException('LINE webhook is not configured');
    }
    if (!signature) throw new UnauthorizedException('Missing LINE signature');
    const expected = createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64');
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Invalid LINE signature');
    }
  }
}

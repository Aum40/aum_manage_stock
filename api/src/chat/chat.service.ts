import { Injectable, Logger } from '@nestjs/common';
import { ChatCommandService } from '../chat-command/chat-command.service';
import { PrismaService } from '../database/prisma.service';
import { ChatAccessService } from './chat-access.service';
import type { ListChatMessagesQueryDto } from './dto/chat.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatAccess: ChatAccessService,
    private readonly chatCommand: ChatCommandService,
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

      return { pendingAction: pending, reply };
    } catch (error) {
      this.logger.warn(
        `chat command failed (shop=${shopId}): ${String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      const reply = this.buildErrorReply(error);

      await this.prisma.chatMessage.create({
        data: {
          shopId,
          userId: ctx.userId,
          channel: 'WEB',
          role: 'ASSISTANT',
          content: reply,
        },
      });

      return { pendingAction: null, reply };
    }
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
      'กดยืนยันเพื่อบันทึก หรือยกเลิกได้จากรายการที่รออยู่',
    ].join('\n');
  }

  private buildErrorReply(error: unknown): string {
    const message =
      error instanceof Error && 'response' in error
        ? String(
            (error as { response?: { message?: string } }).response?.message ??
              error.message,
          )
        : 'ตีความคำสั่งไม่สำเร็จ กรุณาลองพิมพ์ใหม่';

    return `❌ ${message}`;
  }
}

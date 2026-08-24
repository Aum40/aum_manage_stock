import { Module } from '@nestjs/common';
import { ChatCommandModule } from '../chat-command/chat-command.module';
import { LineReplyService } from './line-reply.service';
import { LineWebhookController } from './line-webhook.controller';
import { LineWebhookService } from './line-webhook.service';
import { LINE_IDENTITY_PORT } from './ports/line-identity.port';
import { PrismaLineIdentityAdapter } from './ports/prisma-line-identity.adapter';

@Module({
  imports: [ChatCommandModule],
  controllers: [LineWebhookController],
  providers: [
    LineWebhookService,
    LineReplyService,
    // [อั้ม] feature/chatbot-resource — endpoint sheet ระบุ lineWebhook เป็นของโมดูลนี้
    // เดิมเป็น UnavailableLineIdentityAdapter ที่ throw 503 ไว้ก่อน (fail closed)
    {
      provide: LINE_IDENTITY_PORT,
      useClass: PrismaLineIdentityAdapter,
    },
  ],
})
export class LineModule {}

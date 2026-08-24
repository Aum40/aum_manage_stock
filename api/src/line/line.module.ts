import { Module } from '@nestjs/common';
import { ChatCommandModule } from '../chat-command/chat-command.module';
import { LineWebhookController } from './line-webhook.controller';
import { LineWebhookService } from './line-webhook.service';
import { LINE_IDENTITY_PORT } from './ports/line-identity.port';
import { UnavailableLineIdentityAdapter } from './ports/unavailable-line-identity.adapter';

@Module({
  imports: [ChatCommandModule],
  controllers: [LineWebhookController],
  providers: [
    LineWebhookService,
    {
      provide: LINE_IDENTITY_PORT,
      useClass: UnavailableLineIdentityAdapter,
    },
  ],
})
export class LineModule {}

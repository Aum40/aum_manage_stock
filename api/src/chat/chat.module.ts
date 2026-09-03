import { Module } from '@nestjs/common';
import { ChatCommandModule } from '../chat-command/chat-command.module';
import { ChatAccessService } from './chat-access.service';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [ChatCommandModule],
  controllers: [ChatController],
  providers: [ChatService, ChatAccessService],
})
export class ChatModule {}

import { Module } from '@nestjs/common';
import { ChatAccessService } from './chat-access.service';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { LineWebhookController } from './line-webhook.controller';
import { LLM_PROVIDER } from './llm/llm.port';
import { OllamaLlmAdapter } from './llm/ollama.adapter';

@Module({
  controllers: [ChatbotController, LineWebhookController],
  providers: [
    ChatbotService,
    ChatAccessService,
    { provide: LLM_PROVIDER, useClass: OllamaLlmAdapter },
  ],
})
export class ChatbotModule {}

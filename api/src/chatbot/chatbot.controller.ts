import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { OwnerId } from '../common/decorators/owner-id.decorator';
import { ChatbotService } from './chatbot.service';
import {
  ListChatMessagesQuerySchema,
  SendChatMessageSchema,
  type ListChatMessagesQueryDto,
  type SendChatMessageDto,
} from './dto/chat.dto';

@Controller('shops/:shopId/chat/messages')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Get()
  listMessages(
    @OwnerId() userId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Query(new ZodValidationPipe(ListChatMessagesQuerySchema))
    query: ListChatMessagesQueryDto,
  ) {
    return this.chatbotService.listMessages(userId, shopId, query);
  }

  @Post()
  sendMessage(
    @OwnerId() userId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body(new ZodValidationPipe(SendChatMessageSchema))
    dto: SendChatMessageDto,
  ) {
    return this.chatbotService.sendMessage(userId, shopId, dto.content);
  }
}

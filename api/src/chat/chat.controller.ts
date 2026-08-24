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
import { OwnerId } from '@/common/decorator/owner-id.decorator';
import { ChatService } from './chat.service';
import {
  ListChatMessagesQuerySchema,
  SendChatMessageSchema,
  type ListChatMessagesQueryDto,
  type SendChatMessageDto,
} from './dto/chat.dto';

@Controller('shops/:shopId/chat/messages')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  listMessages(
    @OwnerId() userId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Query(new ZodValidationPipe(ListChatMessagesQuerySchema))
    query: ListChatMessagesQueryDto,
  ) {
    return this.chatService.listMessages(userId, shopId, query);
  }

  @Post()
  sendMessage(
    @OwnerId() userId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body(new ZodValidationPipe(SendChatMessageSchema))
    dto: SendChatMessageDto,
  ) {
    return this.chatService.sendMessage(userId, shopId, dto.content);
  }
}

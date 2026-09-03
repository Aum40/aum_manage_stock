import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { OwnerId } from '@/common/decorator/owner-id.decorator';
import { ChatService } from './chat.service';
import {
  ApplyChatCommandSchema,
  ListChatMessagesQuerySchema,
  SelectChatProductSchema,
  SendChatMessageSchema,
  type ApplyChatCommandDto,
  type ListChatMessagesQueryDto,
  type SelectChatProductDto,
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

  /**
   * เลือกสินค้าให้รายการที่ค้างอยู่ตอนชื่อกำกวม แล้วให้บอทตอบสรุปกลับมา
   * (ฝั่ง LINE ทำเรื่องเดียวกันด้วยการพิมพ์หมายเลข)
   */
  @Patch()
  selectProduct(
    @OwnerId() userId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body(new ZodValidationPipe(SelectChatProductSchema))
    dto: SelectChatProductDto,
  ) {
    return this.chatService.selectProduct(userId, shopId, dto);
  }

  /** ยืนยัน/ยกเลิกรายการที่ค้างอยู่ แล้วให้บอทตอบสรุปผลกลับมา */
  @Put()
  applyCommand(
    @OwnerId() userId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body(new ZodValidationPipe(ApplyChatCommandSchema))
    dto: ApplyChatCommandDto,
  ) {
    return this.chatService.applyCommand(userId, shopId, dto);
  }
}

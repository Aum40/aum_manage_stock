import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import { uuidSchema } from '../common/validation/schemas';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import { ChatCommandService } from './chat-command.service';
import {
  createChatCommandSchema,
  updatePendingActionSchema,
} from './dto/chat-command.dto';
import type {
  CreateChatCommandDto,
  UpdatePendingActionDto,
} from './dto/chat-command.dto';

@Controller('shops/:shopId/stock/chat-command')
export class ChatCommandController {
  constructor(private readonly commands: ChatCommandService) {}

  @Post()
  create(
    @Param('shopId', new ZodValidationPipe(uuidSchema)) shopId: string,
    @CurrentUser('sub') actorId: string,
    @Body(new ZodValidationPipe(createChatCommandSchema))
    body: CreateChatCommandDto,
  ) {
    return this.commands.create({
      shopId,
      actorId,
      source: 'WEB',
      message: body.message,
    });
  }

  @Patch(':pendingId')
  update(
    @Param('shopId', new ZodValidationPipe(uuidSchema)) shopId: string,
    @Param('pendingId', new ZodValidationPipe(uuidSchema)) pendingId: string,
    @CurrentUser('sub') actorId: string,
    @Body(new ZodValidationPipe(updatePendingActionSchema))
    body: UpdatePendingActionDto,
  ) {
    return this.commands.update(shopId, pendingId, actorId, body);
  }

  @Delete(':pendingId')
  cancel(
    @Param('shopId', new ZodValidationPipe(uuidSchema)) shopId: string,
    @Param('pendingId', new ZodValidationPipe(uuidSchema)) pendingId: string,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.commands.cancel(shopId, pendingId, actorId);
  }

  @Post(':pendingId/confirm')
  confirm(
    @Param('shopId', new ZodValidationPipe(uuidSchema)) shopId: string,
    @Param('pendingId', new ZodValidationPipe(uuidSchema)) pendingId: string,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.commands.confirm(shopId, pendingId, actorId);
  }
}

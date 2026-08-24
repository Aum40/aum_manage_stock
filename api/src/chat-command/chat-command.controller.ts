import {
  Body,
  Controller,
  Delete,
  Headers,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
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
    @Headers('x-staff-id') actorId: string | undefined,
    @Body(new ZodValidationPipe(createChatCommandSchema))
    body: CreateChatCommandDto,
  ) {
    return this.commands.create({
      shopId,
      actorId: this.requireActor(actorId),
      source: 'WEB',
      message: body.message,
    });
  }

  @Patch(':pendingId')
  update(
    @Param('shopId', new ZodValidationPipe(uuidSchema)) shopId: string,
    @Param('pendingId', new ZodValidationPipe(uuidSchema)) pendingId: string,
    @Headers('x-staff-id') actorId: string | undefined,
    @Body(new ZodValidationPipe(updatePendingActionSchema))
    body: UpdatePendingActionDto,
  ) {
    return this.commands.update(
      shopId,
      pendingId,
      this.requireActor(actorId),
      body,
    );
  }

  @Delete(':pendingId')
  cancel(
    @Param('shopId', new ZodValidationPipe(uuidSchema)) shopId: string,
    @Param('pendingId', new ZodValidationPipe(uuidSchema)) pendingId: string,
    @Headers('x-staff-id') actorId: string | undefined,
  ) {
    return this.commands.cancel(shopId, pendingId, this.requireActor(actorId));
  }

  @Post(':pendingId/confirm')
  confirm(
    @Param('shopId', new ZodValidationPipe(uuidSchema)) shopId: string,
    @Param('pendingId', new ZodValidationPipe(uuidSchema)) pendingId: string,
    @Headers('x-staff-id') actorId: string | undefined,
  ) {
    return this.commands.confirm(shopId, pendingId, this.requireActor(actorId));
  }

  private requireActor(actorId: string | undefined): string {
    // TODO(auth): replace the temporary header adapter with authenticated staff.
    if (!actorId || !uuidSchema.safeParse(actorId).success) {
      throw new UnauthorizedException('Authenticated staff is required');
    }
    return actorId;
  }
}

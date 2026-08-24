import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import {
  ListNotificationQuerySchema,
  type ListNotificationQueryDto,
} from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @CurrentUser('sub') userId: string,
    @Query(new ZodValidationPipe(ListNotificationQuerySchema))
    query: ListNotificationQueryDto,
  ) {
    return this.notificationsService.findAll(userId, query);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser('sub') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  markAsRead(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.markAsRead(userId, id);
  }
}

import { Body, Controller, Get, Post } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';

import { OwnerId } from '../common/decorators/owner-id.decorator';
import {
  type UpgradeSubscriptionDto,
  upgradeSubscriptionSchema,
} from './dto/subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('subscription-plans')
  listPlans() {
    return this.subscriptionsService.listPlans();
  }

  @Get('subscriptions/me')
  getMySubscription(@OwnerId() ownerId: string) {
    return this.subscriptionsService.getMySubscriptionSummary(ownerId);
  }

  @Post('subscriptions/upgrade')
  upgrade(
    @OwnerId() ownerId: string,
    @Body(new ZodValidationPipe(upgradeSubscriptionSchema))
    dto: UpgradeSubscriptionDto,
  ) {
    return this.subscriptionsService.upgrade(ownerId, dto);
  }

  @Post('subscriptions/renew')
  renew(@OwnerId() ownerId: string) {
    return this.subscriptionsService.renew(ownerId);
  }
}

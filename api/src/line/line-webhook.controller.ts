import { Controller, Headers, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '@/common/decorator/public.decorator';
import { LineWebhookService } from './line-webhook.service';

@Controller('webhooks/line')
export class LineWebhookController {
  constructor(private readonly webhook: LineWebhookService) {}

  /**
   * LINE เรียกเข้ามาเอง ไม่มี JWT จึงต้องเป็น @Public()
   * ความปลอดภัยมาจากการตรวจลายเซ็น x-line-signature ด้วย channel secret แทน
   */
  @Public()
  @Post()
  handle(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-line-signature') signature: string | undefined,
  ) {
    if (!request.rawBody) {
      throw new Error('Raw request body is unavailable');
    }
    return this.webhook.handle(request.rawBody, signature);
  }
}

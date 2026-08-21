import { Controller, Headers, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { LineWebhookService } from './line-webhook.service';

@Controller('webhooks/line')
export class LineWebhookController {
  constructor(private readonly webhook: LineWebhookService) {}

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

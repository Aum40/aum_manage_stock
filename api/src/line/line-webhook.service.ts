import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { ChatCommandService } from '../chat-command/chat-command.service';
import { LINE_IDENTITY_PORT } from './ports/line-identity.port';
import type { LineIdentityPort } from './ports/line-identity.port';

const lineWebhookSchema = z.object({
  destination: z.string().min(1),
  events: z.array(
    z.object({
      type: z.string(),
      source: z.object({ userId: z.string().optional() }).passthrough(),
      message: z
        .object({ type: z.string(), text: z.string().optional() })
        .optional(),
    }),
  ),
});

@Injectable()
export class LineWebhookService {
  constructor(
    private readonly config: ConfigService,
    private readonly commands: ChatCommandService,
    @Inject(LINE_IDENTITY_PORT)
    private readonly identity: LineIdentityPort,
  ) {}

  async handle(rawBody: Buffer, signature: string | undefined) {
    this.verifySignature(rawBody, signature);
    const payload = lineWebhookSchema.parse(
      JSON.parse(rawBody.toString('utf8')),
    );
    const results: Array<{ pendingActionId: string }> = [];
    for (const event of payload.events) {
      if (
        event.type !== 'message' ||
        event.message?.type !== 'text' ||
        !event.message.text ||
        !event.source.userId
      ) {
        continue;
      }
      const identity = await this.identity.resolve({
        destination: payload.destination,
        lineUserId: event.source.userId,
      });
      const pending = await this.commands.create({
        ...identity,
        source: 'LINE',
        message: event.message.text,
      });
      results.push({ pendingActionId: pending.id });
      // TODO(line): send a confirmation message/reply token through a LINE client
      // adapter. Business state is already handled exclusively by ChatCommandService.
    }
    return { accepted: true, results };
  }

  private verifySignature(
    rawBody: Buffer,
    signature: string | undefined,
  ): void {
    const secret = this.config.get<string>('LINE_CHANNEL_SECRET');
    if (!secret) {
      throw new ServiceUnavailableException('LINE webhook is not configured');
    }
    if (!signature) throw new UnauthorizedException('Missing LINE signature');
    const expected = createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64');
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Invalid LINE signature');
    }
  }
}

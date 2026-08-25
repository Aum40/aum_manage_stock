import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AccessTokenService } from '@/auth/access-token.service';
import { AiAccessService } from './ai-access.service';

/**
 * Gateway แรกของโปรเจกต์ — วาง pattern ไว้ให้โมดูลอื่นทำตาม
 *
 * เส้นทางตาม endpoint sheet: WS /ws/shops/:shopId
 * socket.io ไม่ได้ route ด้วย path parameter จึงรับ shopId มาทาง handshake แทน
 * แล้วใช้ room ต่อร้าน (`shop:<shopId>`) เพื่อส่งเฉพาะคนที่มีสิทธิ์ในร้านนั้น
 *
 * client เชื่อมต่อแบบนี้:
 *   io('http://host/ws/shops', { auth: { token: '<JWT>', shopId: '<uuid>' } })
 */
@WebSocketGateway({
  namespace: '/ws/shops',
  cors: { origin: true, credentials: true },
})
export class AiRecommendationsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(AiRecommendationsGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly accessToken: AccessTokenService,
    private readonly access: AiAccessService,
  ) {}

  /**
   * AuthGuard ของ HTTP ไม่ครอบ WebSocket จึงต้องตรวจ JWT เองที่นี่
   * และต้องตรวจสิทธิ์ระดับร้านด้วย ไม่งั้นใครก็ join ห้องร้านคนอื่นแล้วดูคำแนะนำได้
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const { token, shopId } = this.readHandshake(client);
      const payload = await this.accessToken.verify(token);
      const userId =
        payload.role === 'SHOP_STAFF' && payload.ownerId
          ? payload.sub
          : payload.sub;

      await this.access.assertCanViewAi(userId, shopId);

      await client.join(this.room(shopId));
      client.emit('connected', { shopId });
    } catch (error) {
      this.logger.warn(`ปฏิเสธการเชื่อมต่อ WebSocket: ${String(error)}`);
      client.emit('unauthorized', {
        message: 'เชื่อมต่อไม่สำเร็จ ตรวจสอบ token และสิทธิ์เข้าถึงร้าน',
      });
      client.disconnect(true);
    }
  }

  emitRecommendations(shopId: string, recommendations: unknown[]): void {
    this.server
      ?.to(this.room(shopId))
      .emit('recommendations.updated', { shopId, recommendations });
  }

  emitDismissed(shopId: string, recommendationId: string): void {
    this.server
      ?.to(this.room(shopId))
      .emit('recommendations.dismissed', { shopId, recommendationId });
  }

  private room(shopId: string): string {
    return `shop:${shopId}`;
  }

  private readHandshake(client: Socket): { token: string; shopId: string } {
    const auth = client.handshake.auth as {
      token?: string;
      shopId?: string;
    };
    const token =
      auth.token ??
      (client.handshake.headers.authorization ?? '').replace(/^Bearer /i, '');
    const shopId = auth.shopId ?? (client.handshake.query.shopId as string);

    if (!token) throw new Error('ไม่มี token ใน handshake');
    if (!shopId) throw new Error('ไม่มี shopId ใน handshake');

    return { token, shopId };
  }
}

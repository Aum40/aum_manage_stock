import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { messagingApi } from '@line/bot-sdk';

@Injectable()
export class LineReplyService {
  private readonly logger = new Logger(LineReplyService.name);
  private client: messagingApi.MessagingApiClient | null = null;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('LINE_CHANNEL_ACCESS_TOKEN'));
  }

  /**
   * ตอบกลับด้วย replyToken ใช้ได้ครั้งเดียวและหมดอายุเร็ว
   * ถ้าส่งไม่สำเร็จห้าม throw ต่อ เพราะจะทำให้ webhook ตอบ non-2xx
   * แล้ว LINE จะยิงซ้ำ ทั้งที่สต็อกถูกบันทึกไปเรียบร้อยแล้ว
   */
  async reply(replyToken: string, text: string): Promise<void> {
    const client = this.getClient();

    if (!client) {
      this.logger.warn(
        'ยังไม่ได้ตั้ง LINE_CHANNEL_ACCESS_TOKEN จึงข้ามการตอบกลับ',
      );
      return;
    }

    try {
      await client.replyMessage({
        replyToken,
        messages: [{ type: 'text', text: text.slice(0, 4900) }],
      });
    } catch (error) {
      this.logger.error(
        `ตอบกลับ LINE ไม่สำเร็จ: ${String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private getClient(): messagingApi.MessagingApiClient | null {
    if (this.client) return this.client;

    const channelAccessToken = this.config.get<string>(
      'LINE_CHANNEL_ACCESS_TOKEN',
    );

    if (!channelAccessToken) return null;

    this.client = new messagingApi.MessagingApiClient({ channelAccessToken });

    return this.client;
  }
}

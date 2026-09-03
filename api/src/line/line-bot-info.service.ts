import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { messagingApi } from '@line/bot-sdk';
import * as QRCode from 'qrcode';

export interface LineBotInvite {
  /** ไอดีที่พิมพ์ค้นในแอป LINE ได้ เช่น "@213lduey" */
  basicId: string;
  displayName: string;
  /** ลิงก์เพิ่มเพื่อน — เปิดบนมือถือแล้วเด้งเข้าแอป LINE ที่หน้าบอทเลย */
  addFriendUrl: string;
  /** QR ของ addFriendUrl ในรูป data URL พร้อมใส่ <img> ได้ทันที */
  qrCodeDataUrl: string;
}

/**
 * [อั้ม] ข้อมูลสำหรับ "เพิ่มบอทเป็นเพื่อน" — ใช้ตอนผู้ใช้เผลอลบห้องแชททิ้ง
 *
 * bot_prompt=aggressive ชวนแอดบอทเฉพาะตอนผูกบัญชีครั้งแรกเท่านั้น พอผูกไปแล้ว
 * ลบห้องทิ้ง ก็ไม่มีขั้นตอนไหนในเว็บพากลับเข้าไปเพิ่มใหม่ได้อีกเลย
 *
 * ## ทำไมถึงดึงจาก LINE แทนที่จะฝังรูป QR ไว้ในโปรเจกต์
 *
 * QR ที่ฝังไว้จะชี้บอทตัวเก่าเงียบ ๆ ทันทีที่เปลี่ยน channel ซึ่งโปรเจกต์นี้เคยเปลี่ยน
 * มาแล้วรอบหนึ่ง (ย้าย LINE Login ไป provider เดียวกับบอท) และไม่มีอะไรฟ้องเลย —
 * ผู้ใช้จะสแกนแล้วไปเจอบอทที่ไม่มีใครฟังอยู่ ดึงสด ๆ จาก token ที่ใช้คุยกันอยู่จริง
 * จึงเป็นตัวเดียวกับที่ตอบข้อความเสมอ ตามนิยาม
 */
@Injectable()
export class LineBotInfoService {
  private readonly logger = new Logger(LineBotInfoService.name);
  private client: messagingApi.MessagingApiClient | null = null;
  private cached: LineBotInvite | null = null;

  constructor(private readonly config: ConfigService) {}

  /**
   * ข้อมูลบอทแทบไม่เปลี่ยนตลอดอายุโปรเจกต์ แต่ถูกเรียกทุกครั้งที่เปิดหน้าโปรไฟล์
   * และหน้าแชทบอท — cache ไว้จึงไม่ต้องยิง LINE API แล้ววาด QR ใหม่ทุกครั้ง
   */
  async getInvite(): Promise<LineBotInvite> {
    if (this.cached) return this.cached;

    const client = this.getClient();

    if (!client) {
      throw new ServiceUnavailableException(
        'ยังไม่ได้ตั้งค่าแชทบอท LINE กรุณาติดต่อผู้ดูแลระบบ',
      );
    }

    let info: messagingApi.BotInfoResponse;

    try {
      info = await client.getBotInfo();
    } catch (error) {
      this.logger.error(
        `ดึงข้อมูลบอท LINE ไม่สำเร็จ: ${String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new ServiceUnavailableException(
        'ดึงข้อมูลแชทบอท LINE ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
      );
    }

    // "@" ต้องเป็น %40 ไม่งั้นลิงก์เพิ่มเพื่อนพังในบางเบราว์เซอร์
    const addFriendUrl = `https://line.me/R/ti/p/${encodeURIComponent(info.basicId)}`;

    this.cached = {
      basicId: info.basicId,
      displayName: info.displayName,
      addFriendUrl,
      qrCodeDataUrl: await QRCode.toDataURL(addFriendUrl),
    };

    return this.cached;
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

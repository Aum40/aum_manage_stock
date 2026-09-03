import { Controller, Get } from '@nestjs/common';

import { LineBotInfoService, LineBotInvite } from './line-bot-info.service';

/**
 * [อั้ม] ข้อมูลเพิ่มบอทเป็นเพื่อน — เว็บเอาไปแสดง QR ให้คนที่ลบห้องแชททิ้ง
 *
 * ไม่ต้องใช้ @OwnerId() เพราะบอทมีตัวเดียวทั้งระบบ ไม่ได้ผูกกับร้านหรือเจ้าของ
 * ส่วน AuthGuard เป็น global guard อยู่แล้ว เส้นนี้จึงต้องล็อกอินก่อนโดยอัตโนมัติ
 */
@Controller('line')
export class LineBotController {
  constructor(private readonly botInfo: LineBotInfoService) {}

  @Get('bot-invite')
  getBotInvite(): Promise<LineBotInvite> {
    return this.botInfo.getInvite();
  }
}

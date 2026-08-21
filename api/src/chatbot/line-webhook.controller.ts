import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

@Controller('webhooks/line')
export class LineWebhookController {
  @Post()
  @HttpCode(HttpStatus.OK)
  handleWebhook() {
    // TODO(line): ยังไม่ต่อ LINE Channel จริง — ทีมตัดสินใจเน้นแชทหน้าเว็บก่อนเดโม 28 ส.ค.
    // เมื่อจะต่อจริงต้องทำตามลำดับนี้:
    //   1. validate X-Line-Signature ด้วย channel secret (@line/bot-sdk ติดตั้งแล้ว)
    //   2. resolve users.line_user_id -> user (เช็คสดทุกครั้ง ห้าม cache — SRS §31, §91)
    //      บัญชีที่ไม่ได้ผูก LINE ใช้ AI Chat ทาง LINE ไม่ได้
    //   3. ส่งข้อความเข้า ChatbotService.sendMessage() ด้วย channel = 'LINE'
    //   4. ตอบกลับผ่าน LINE Messaging API
    // LINE ต้องได้ 200 เสมอ ไม่งั้นจะ retry ซ้ำ
    return { ok: true };
  }
}

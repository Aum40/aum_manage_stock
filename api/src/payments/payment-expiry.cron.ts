import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PaymentsService } from './payments.service';

/**
 * ปิดใบชำระเงินที่เปิดค้างเกิน 24 ชั่วโมง
 *
 * ระบบนี้ไม่ใช้ Stripe webhook — ไม่มี event มาบอกว่าบัตรถูกปฏิเสธหรือผู้ใช้
 * ทิ้งใบไว้เฉยๆ ใบที่จ่ายไม่สำเร็จจึงค้าง PENDING ตลอดกาลถ้าไม่มีตัวนี้
 *
 * เดินรายชั่วโมงแทนรายวัน เพราะตราบใดที่ยังไม่ยกเลิกฝั่ง Stripe ผู้ใช้ที่ถือ
 * client secret เก่ายังจ่ายผ่านได้อยู่ ยิ่งทิ้งไว้นานยิ่งเสี่ยงที่จะมีเงินเข้ามา
 * โดยไม่มีแพ็กเกจให้
 *
 * PaymentsService.listMyPayments() ก็เรียกงานเดียวกันตอนผู้ใช้เปิดหน้าประวัติ
 * เพื่อไม่ให้เห็นปุ่ม "ชำระอีกครั้ง" ค้างระหว่างรอรอบถัดไปของ cron ตัวนี้
 */
@Injectable()
export class PaymentExpiryCron {
  private readonly logger = new Logger(PaymentExpiryCron.name);

  constructor(private readonly payments: PaymentsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async run() {
    try {
      const expired = await this.payments.expireStalePayments();
      if (expired > 0) {
        this.logger.log(`ปิดใบชำระเงินที่หมดอายุ ${expired} รายการ`);
      }
    } catch (error) {
      // cron ล้มต้องไม่ทำให้ process ตาย รอบหน้าค่อยลองใหม่
      this.logger.error(
        `ปิดใบชำระเงินที่หมดอายุไม่สำเร็จ: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

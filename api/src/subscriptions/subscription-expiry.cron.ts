import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '../database/prisma.service';
import {
  NOTIFICATION_TYPE,
  NotificationsService,
} from '../notifications/notifications.service';

// TODO(subscriptions-resource): ยืนยันจำนวนวันแจ้งเตือนล่วงหน้ากับ SRS §122
// ให้แน่ชัด — ใช้ 7 วันไปก่อนตามค่ามาตรฐานทั่วไป
const EXPIRY_NOTICE_DAYS = 7;

@Injectable()
export class SubscriptionExpiryCron {
  private readonly logger = new Logger(SubscriptionExpiryCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async run() {
    await this.expireOverdueSubscriptions();
    await this.notifyUpcomingExpiries();
  }

  /**
   * isSubscriptionReadOnly() คำนวณ read-only จาก expires_at สดอยู่แล้ว จึง
   * ปลอดภัยอยู่ก่อนหน้านี้ แต่คอลัมน์ status เองยังค้าง ACTIVE หลังหมดอายุ —
   * โค้ดที่เผลอเช็ค status ตรงๆ (ข้าม util ตัวนี้) จะพลาด งานนี้แค่ทำให้
   * status สะท้อนความจริง ไม่ใช่ตัว enforce หลัก
   */
  private async expireOverdueSubscriptions() {
    const now = new Date();
    const result = await this.prisma.subscription.updateMany({
      where: { status: 'ACTIVE', expiresAt: { lte: now } },
      data: { status: 'EXPIRED' },
    });

    if (result.count > 0) {
      this.logger.log(`พลิก ${result.count} subscription(s) เป็น EXPIRED`);
    }
  }

  /** SRS §122 — แจ้งเตือนก่อนหมดอายุ ครั้งเดียวต่อรอบสมัคร (dedupe ด้วย expiryNotifiedAt) */
  private async notifyUpcomingExpiries() {
    const now = new Date();
    const noticeWindowEnd = new Date(now);
    noticeWindowEnd.setDate(noticeWindowEnd.getDate() + EXPIRY_NOTICE_DAYS);

    const dueForNotice = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        expiryNotifiedAt: null,
        expiresAt: { gte: now, lte: noticeWindowEnd },
      },
      include: { plan: true },
    });

    for (const subscription of dueForNotice) {
      await this.notifications.emit({
        userId: subscription.userId,
        type: NOTIFICATION_TYPE.SUBSCRIPTION_EXPIRING,
        title: 'แพ็กเกจใกล้หมดอายุ',
        message: `แพ็กเกจ ${subscription.plan.nameTh} ของคุณจะหมดอายุในวันที่ ${subscription.expiresAt?.toLocaleDateString('th-TH')} ต่ออายุก่อนหมดเพื่อไม่ให้ร้านค้าเข้าโหมดอ่านอย่างเดียว`,
      });

      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { expiryNotifiedAt: now },
      });
    }

    if (dueForNotice.length > 0) {
      this.logger.log(
        `แจ้งเตือนใกล้หมดอายุไปแล้ว ${dueForNotice.length} บัญชี`,
      );
    }
  }
}

import { PrismaService } from '@/database/prisma.service';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

/**
 * แพ็กเกจ 3 ระดับตาม SRS §57-59 (ดูตารางใน AGENTS.md)
 * duration_months null = ไม่มีวันหมดอายุ (Free Plan เท่านั้น)
 *
 * ประตูฟีเจอร์ระดับแพ็กเกจ: chatbot/barcode = Plus + Pro,
 * aiRecommendation = Pro เท่านั้น (SRS §193 — คนละประตูกัน ห้ามรวมเป็นตัวเดียว)
 * ค่าชุดเดียวกันนี้อยู่ใน prisma/sql/003_seed_subscription_plans.sql ด้วย
 * แก้ที่ไหนต้องแก้อีกที่เสมอ
 */
const PLANS = [
  {
    code: 'FREE',
    nameTh: 'ฟรี',
    priceThb: 0,
    durationMonths: null,
    includedShopQuota: 1,
    includedStaffQuota: 0,
    maxActiveProducts: 100,
    chatbotEnabled: false,
    barcodeEnabled: false,
    aiRecommendationEnabled: false,
    isFree: true,
  },
  {
    code: 'PLUS',
    nameTh: 'พลัส',
    priceThb: 2499,
    durationMonths: 12,
    includedShopQuota: 3,
    includedStaffQuota: 6,
    maxActiveProducts: 3000,
    chatbotEnabled: true,
    barcodeEnabled: true,
    aiRecommendationEnabled: false,
    isFree: false,
  },
  {
    code: 'PRO',
    nameTh: 'โปร',
    priceThb: 3499,
    durationMonths: 12,
    includedShopQuota: 5,
    includedStaffQuota: 10,
    maxActiveProducts: 5000,
    chatbotEnabled: true,
    barcodeEnabled: true,
    // SRS §193 — AI Recommendations เป็นของ Pro อย่างเดียว (คนละประตูกับ AI Chat)
    aiRecommendationEnabled: true,
    isFree: false,
  },
] as const;

/**
 * เติมแพ็กเกจให้อัตโนมัติตอนแอปเริ่มทำงาน
 *
 * ทำไมต้องทำตรงนี้ ไม่ใช่ปล่อยให้รัน SQL เอง:
 * ถ้าไม่มีแพ็กเกจใน DB จะ "สมัครสมาชิกไม่ผ่าน" เลย เพราะตอนสร้างเจ้าของร้าน
 * ต้อง connect กับแพ็กเกจ FREE — เป็นข้อมูลที่ระบบขาดไม่ได้ ไม่ใช่ข้อมูลตัวอย่าง
 * และ prisma db push ไม่รัน seed ให้ ทำให้มีโอกาสลืมสูงมาก
 *
 * ปลอดภัยกับ CI เพราะ CI รันแค่ lint/test/build ไม่เคย boot แอป
 *
 * เจตนา: "สร้างให้ถ้ายังไม่มี" เท่านั้น ไม่ทับของเดิม เผื่อมีคนแก้ราคาใน DB
 * ไว้โดยตั้งใจ จะได้ไม่ถูก reset ทุกครั้งที่แอป restart — แต่ถ้าค่าที่มีอยู่
 * ไม่ตรงกับ SRS จะเตือนใน log ให้เห็นว่า drift
 * ถ้าต้องการบังคับให้ตรง SRS ใช้ prisma/sql/003_seed_subscription_plans.sql
 */
@Injectable()
export class SubscriptionPlanSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(SubscriptionPlanSeeder.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    try {
      const existing = await this.prisma.subscriptionPlan.findMany({
        where: { code: { in: PLANS.map((plan) => plan.code) } },
      });
      const existingByCode = new Map(existing.map((p) => [p.code, p]));

      const missing = PLANS.filter((plan) => !existingByCode.has(plan.code));
      if (missing.length > 0) {
        await this.prisma.subscriptionPlan.createMany({
          data: missing.map((plan) => ({ ...plan, isActive: true })),
        });
        this.logger.log(
          `เพิ่มแพ็กเกจที่ยังไม่มี: ${missing.map((p) => p.code).join(', ')}`,
        );
      }

      for (const plan of PLANS) {
        const found = existingByCode.get(plan.code);
        if (!found) continue;

        // เตือนเฉพาะ drift ที่กระทบสิทธิ์การใช้งานจริง: ราคา + ประตูฟีเจอร์
        const drift = [
          Number(found.priceThb) !== plan.priceThb
            ? `price_thb=${found.priceThb.toString()} (SRS ${plan.priceThb})`
            : null,
          found.chatbotEnabled !== plan.chatbotEnabled
            ? `chatbot_enabled=${found.chatbotEnabled} (SRS ${plan.chatbotEnabled})`
            : null,
          found.barcodeEnabled !== plan.barcodeEnabled
            ? `barcode_enabled=${found.barcodeEnabled} (SRS ${plan.barcodeEnabled})`
            : null,
          found.aiRecommendationEnabled !== plan.aiRecommendationEnabled
            ? `ai_recommendation_enabled=${found.aiRecommendationEnabled} (SRS ${plan.aiRecommendationEnabled})`
            : null,
        ].filter((item): item is string => item !== null);

        if (drift.length > 0) {
          this.logger.warn(
            `แพ็กเกจ ${plan.code} ใน DB ไม่ตรงกับ SRS: ${drift.join(', ')} — ` +
              'ถ้าตั้งใจแก้ก็ปล่อยไว้ได้ ถ้าไม่ ให้รัน prisma/sql/003_seed_subscription_plans.sql',
          );
        }
      }
    } catch (error) {
      // ไม่ crash แอป เพราะอาจเป็นแค่ DB ยังไม่พร้อมตอน boot
      // แต่ต้อง log ให้ดังพอ เพราะถ้าไม่มีแพ็กเกจจะสมัครสมาชิกไม่ได้เลย
      this.logger.error(
        'เติมแพ็กเกจอัตโนมัติไม่สำเร็จ — ถ้าตาราง subscription_plans ว่างจะสมัครสมาชิกไม่ผ่าน',
        error,
      );
    }
  }
}

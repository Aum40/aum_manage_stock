import { SubscriptionsService } from './subscriptions.service';
import type { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../database/generated/prisma/client';

const USER = '0199a0e0-0000-7000-8000-000000000001';
const PLUS = {
  id: 'p-plus',
  code: 'PLUS',
  priceThb: 2499,
  durationMonths: 12,
  includedShopQuota: 3,
  isFree: false,
  isActive: true,
};
const PRO = {
  id: 'p-pro',
  code: 'PRO',
  priceThb: 3499,
  durationMonths: 12,
  includedShopQuota: 5,
  isFree: false,
  isActive: true,
};

/** วันหมดอายุเดิมของแพ็กเกจ PLUS ที่ยังเหลืออีกครึ่งปี */
const CURRENT_EXPIRY = new Date('2027-02-28T00:00:00.000Z');
const STARTED_AT = new Date('2026-02-28T00:00:00.000Z');

type Tx = {
  subscription: { findUnique: jest.Mock; update: jest.Mock };
  subscriptionPlan: { findUnique: jest.Mock };
};

/** ดึง data ที่ส่งเข้า subscription.update ออกมาแบบมีชนิด กัน no-unsafe-member-access */
function updateData(mock: jest.Mock): Record<string, unknown> {
  const [first] = mock.mock.calls as [[{ data: Record<string, unknown> }]];
  return first[0].data;
}

function setup() {
  const tx: Tx = {
    subscription: {
      findUnique: jest.fn().mockResolvedValue({
        userId: USER,
        planId: PLUS.id,
        plan: PLUS,
        status: 'ACTIVE',
        startedAt: STARTED_AT,
        expiresAt: CURRENT_EXPIRY,
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    subscriptionPlan: { findUnique: jest.fn().mockResolvedValue(PRO) },
  };
  const service = new SubscriptionsService({} as unknown as PrismaService);
  return { service, tx: tx as unknown as Prisma.TransactionClient, raw: tx };
}

describe('SubscriptionsService.applyUpgrade', () => {
  /**
   * ราคาที่เก็บกับวันหมดอายุต้องไปด้วยกันเสมอ — จ่ายแค่ส่วนต่างแล้วได้รอบใหม่
   * เต็มปีคือการแถมฟรีหนึ่งรอบ ซึ่งเป็นเหตุผลที่ keepExpiry ถูกส่งมาจาก
   * PaymentsService แทนที่จะคำนวณซ้ำที่นี่
   */
  it('keepExpiry = true ไม่แตะ expiresAt และ startedAt', async () => {
    const { service, tx, raw } = setup();

    await service.applyUpgrade(USER, 'PRO', tx, { keepExpiry: true });

    const data = updateData(raw.subscription.update);
    expect(data.planId).toBe(PRO.id);
    expect(data.status).toBe('ACTIVE');
    expect(data).not.toHaveProperty('expiresAt');
    expect(data).not.toHaveProperty('startedAt');
  });

  it('keepExpiry = false เริ่มรอบใหม่เต็มระยะเวลาของแพ็กเกจ', async () => {
    const { service, tx, raw } = setup();

    await service.applyUpgrade(USER, 'PRO', tx, { keepExpiry: false });

    const data = updateData(raw.subscription.update) as {
      startedAt: Date;
      expiresAt: Date;
    };
    expect(data.startedAt).toBeInstanceOf(Date);
    expect(data.expiresAt.getTime()).toBeGreaterThan(CURRENT_EXPIRY.getTime());
  });

  it('ไม่ส่ง options มาเลย = พฤติกรรมเดิม คือเริ่มรอบใหม่', async () => {
    const { service, tx, raw } = setup();

    await service.applyUpgrade(USER, 'PRO', tx);

    expect(updateData(raw.subscription.update)).toHaveProperty('expiresAt');
  });

  it('keepExpiry = true แต่ไม่มีวันหมดอายุเดิม (มาจาก FREE) ต้องตั้งรอบใหม่ให้', async () => {
    const { service, tx, raw } = setup();
    raw.subscription.findUnique.mockResolvedValue({
      userId: USER,
      planId: 'p-free',
      plan: { ...PLUS, id: 'p-free', code: 'FREE', isFree: true, priceThb: 0 },
      status: 'ACTIVE',
      startedAt: STARTED_AT,
      expiresAt: null,
    });

    await service.applyUpgrade(USER, 'PRO', tx, { keepExpiry: true });

    expect(updateData(raw.subscription.update)).toHaveProperty('expiresAt');
  });
});

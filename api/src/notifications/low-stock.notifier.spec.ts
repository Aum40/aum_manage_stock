import type { PrismaService } from '../database/prisma.service';
import { LowStockNotifier } from './low-stock.notifier';
import type { NotificationsService } from './notifications.service';

const SHOP = '0199a0e0-0000-7000-8000-000000000010';
const OWNER = '0199a0e0-0000-7000-8000-000000000001';

type EmittedNotification = {
  userId: string;
  shopId: string;
  type: string;
  title: string;
  message: string;
  dedupeScope?: Record<string, string>;
};

function setup(rows: unknown[]) {
  const findMany = jest.fn().mockResolvedValue(rows);
  const emit = jest.fn<Promise<void>, [EmittedNotification]>();
  emit.mockResolvedValue(undefined);
  const notifier = new LowStockNotifier(
    { shopProduct: { findMany } } as unknown as PrismaService,
    { emit } as unknown as NotificationsService,
  );
  return { notifier, findMany, emit };
}

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'sp-1',
  lowStockThreshold: 10,
  product: { name: 'ไข่ไก่ เบอร์ 2', unit: 'ฟอง' },
  shop: { id: SHOP, name: 'สาขาหนึ่ง', ownerId: OWNER },
  ...overrides,
});

describe('LowStockNotifier', () => {
  it('แจ้งเตือนเมื่อสต็อกข้ามจากเหนือจุดแจ้งเตือนลงมาต่ำกว่า', async () => {
    const { notifier, emit } = setup([row()]);

    await notifier.notifyIfCrossed([
      { shopProductId: 'sp-1', quantityBefore: 12, quantityAfter: 8 },
    ]);

    expect(emit).toHaveBeenCalledTimes(1);
    const input = emit.mock.calls[0][0];
    expect(input.userId).toBe(OWNER);
    expect(input.shopId).toBe(SHOP);
    expect(input.type).toBe('LOW_STOCK');
    expect(input.message).toContain('เหลือ 8 ฟอง');
    // ไม่งั้นสินค้าตัวที่สองในร้านเดียวกันจะถูกกลืนหายไปกับตัวแรก
    expect(input.dedupeScope).toEqual({ shopProductId: 'sp-1' });
  });

  it('ต่ำกว่าจุดแจ้งเตือนอยู่แล้ว ขายซ้ำไม่แจ้งอีก', async () => {
    const { notifier, emit } = setup([row()]);

    await notifier.notifyIfCrossed([
      { shopProductId: 'sp-1', quantityBefore: 8, quantityAfter: 5 },
    ]);

    expect(emit).not.toHaveBeenCalled();
  });

  it('ยังเหนือจุดแจ้งเตือน ไม่แจ้ง', async () => {
    const { notifier, emit } = setup([row()]);

    await notifier.notifyIfCrossed([
      { shopProductId: 'sp-1', quantityBefore: 40, quantityAfter: 30 },
    ]);

    expect(emit).not.toHaveBeenCalled();
  });

  it('สต็อกเพิ่มขึ้น ไม่ต้องแตะฐานข้อมูลเลย', async () => {
    const { notifier, findMany, emit } = setup([row()]);

    await notifier.notifyIfCrossed([
      { shopProductId: 'sp-1', quantityBefore: 3, quantityAfter: 50 },
    ]);

    expect(findMany).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it('หมดเกลี้ยงใช้ข้อความคนละแบบกับใกล้หมด', async () => {
    const { notifier, emit } = setup([row({ lowStockThreshold: 0 })]);

    await notifier.notifyIfCrossed([
      { shopProductId: 'sp-1', quantityBefore: 4, quantityAfter: 0 },
    ]);

    const input = emit.mock.calls[0][0];
    expect(input.title).toBe('สินค้าหมดสต็อก');
    expect(input.message).toContain('หมดแล้ว');
  });

  it('หลายสินค้าในบิลเดียว แจ้งเฉพาะตัวที่ข้ามเส้น', async () => {
    const { notifier, emit } = setup([
      row(),
      row({ id: 'sp-2', product: { name: 'นมสด', unit: 'กล่อง' } }),
    ]);

    await notifier.notifyIfCrossed([
      { shopProductId: 'sp-1', quantityBefore: 12, quantityAfter: 8 },
      { shopProductId: 'sp-2', quantityBefore: 50, quantityAfter: 40 },
    ]);

    expect(emit).toHaveBeenCalledTimes(1);
    const input = emit.mock.calls[0][0];
    expect(input.message).toContain('ไข่ไก่ เบอร์ 2');
  });
});

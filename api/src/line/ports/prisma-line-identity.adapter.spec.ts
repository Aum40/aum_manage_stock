import type { PrismaService } from '../../database/prisma.service';
import { LineUserMessageError } from '../line-user-message.error';
import { PrismaLineIdentityAdapter } from './prisma-line-identity.adapter';

type PrismaMock = {
  user: { findFirst: jest.Mock };
  shop: { findMany: jest.Mock };
  shopStaff: { findMany: jest.Mock };
};

const LINE_USER_ID = 'U_line_user';
const DESTINATION = 'Uplatformbot';

function createPrismaMock(): PrismaMock {
  return {
    user: { findFirst: jest.fn() },
    shop: { findMany: jest.fn().mockResolvedValue([]) },
    shopStaff: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

describe('PrismaLineIdentityAdapter', () => {
  let prisma: PrismaMock;
  let adapter: PrismaLineIdentityAdapter;

  const resolve = (message: string) =>
    adapter.resolve({
      destination: DESTINATION,
      lineUserId: LINE_USER_ID,
      message,
    });

  beforeEach(() => {
    prisma = createPrismaMock();
    adapter = new PrismaLineIdentityAdapter(prisma as unknown as PrismaService);
  });

  it('ปฏิเสธเมื่อบัญชี LINE ยังไม่ได้ผูกกับระบบ', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(resolve('เพิ่มโค้ก10')).rejects.toThrow(LineUserMessageError);
    await expect(resolve('เพิ่มโค้ก10')).rejects.toThrow('ยังไม่ได้ผูก');
  });

  it('ปฏิเสธเมื่อบัญชีถูกระงับ', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      role: 'SHOP_OWNER',
      status: 'SUSPENDED',
    });

    await expect(resolve('เพิ่มโค้ก10')).rejects.toThrow('ถูกระงับ');
  });

  it('เช็ค lineUserId สดจากฐานข้อมูลทุกครั้ง ไม่ cache (SRS §31/§91)', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      role: 'SHOP_OWNER',
      status: 'ACTIVE',
    });
    prisma.shop.findMany.mockResolvedValue([{ id: 's1', name: 'ร้านเดียว' }]);

    await resolve('เพิ่มโค้ก10');
    await resolve('เพิ่มโค้ก10');

    expect(prisma.user.findFirst).toHaveBeenCalledTimes(2);
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { lineUserId: LINE_USER_ID, deletedAt: null },
      }),
    );
  });

  describe('เจ้าของร้าน', () => {
    beforeEach(() => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'owner1',
        role: 'SHOP_OWNER',
        status: 'ACTIVE',
      });
    });

    it('ร้านเดียว → ผ่านเลย ไม่ต้องระบุชื่อร้าน', async () => {
      prisma.shop.findMany.mockResolvedValue([{ id: 's1', name: 'ร้านเดียว' }]);

      await expect(resolve('เพิ่มโค้ก10')).resolves.toEqual({
        shopId: 's1',
        actorId: 'owner1',
        message: 'เพิ่มโค้ก10',
      });
    });

    it('ไม่มีร้าน → บอกให้ไปสร้างร้านก่อน', async () => {
      prisma.shop.findMany.mockResolvedValue([]);

      await expect(resolve('เพิ่มโค้ก10')).rejects.toThrow('ยังไม่มีร้านค้า');
    });

    it('หลายร้าน ไม่ระบุชื่อ → ตอบกลับพร้อมรายชื่อร้านให้เลือก', async () => {
      prisma.shop.findMany.mockResolvedValue([
        { id: 'sa', name: 'สาขาA' },
        { id: 'sb', name: 'สาขาB' },
      ]);

      await expect(resolve('เพิ่มโค้ก10')).rejects.toThrow(
        /มีหลายร้าน[\s\S]*สาขาA[\s\S]*สาขาB/,
      );
    });

    it('หลายร้าน ระบุชื่อนำหน้า → เลือกร้านถูกและตัดชื่อร้านออกจากคำสั่ง', async () => {
      prisma.shop.findMany.mockResolvedValue([
        { id: 'sa', name: 'สาขาA' },
        { id: 'sb', name: 'สาขาB' },
      ]);

      await expect(resolve('สาขาB เพิ่มโค้ก 10')).resolves.toEqual({
        shopId: 'sb',
        actorId: 'owner1',
        message: 'เพิ่มโค้ก 10',
      });
    });

    it('ชื่อร้านที่ยาวกว่าชนะ กันชื่อที่เป็นคำนำหน้าของอีกร้าน', async () => {
      prisma.shop.findMany.mockResolvedValue([
        { id: 'short', name: 'ร้าน' },
        { id: 'long', name: 'ร้านสาขา2' },
      ]);

      await expect(resolve('ร้านสาขา2 เพิ่มโค้ก 10')).resolves.toEqual(
        expect.objectContaining({ shopId: 'long', message: 'เพิ่มโค้ก 10' }),
      );
    });

    it('ระบุชื่อร้านแต่ไม่มีคำสั่งต่อท้าย → บอกให้พิมพ์คำสั่ง', async () => {
      prisma.shop.findMany.mockResolvedValue([
        { id: 'sa', name: 'สาขาA' },
        { id: 'sb', name: 'สาขาB' },
      ]);

      await expect(resolve('สาขาA')).rejects.toThrow('ยังไม่มีคำสั่ง');
    });
  });

  describe('พนักงาน', () => {
    beforeEach(() => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'staff1',
        role: 'SHOP_STAFF',
        status: 'ACTIVE',
      });
    });

    it('ใช้ร้านที่ถูก assign เท่านั้น ไม่ใช่ร้านทั้งหมดของเจ้าของ', async () => {
      prisma.shopStaff.findMany.mockResolvedValue([
        { shop: { id: 's1', name: 'ร้านที่ได้รับมอบหมาย' } },
      ]);

      await expect(resolve('เพิ่มโค้ก10')).resolves.toEqual(
        expect.objectContaining({ shopId: 's1', actorId: 'staff1' }),
      );
      expect(prisma.shop.findMany).not.toHaveBeenCalled();

      const [[args]] = prisma.shopStaff.findMany.mock.calls as [
        [{ where: Record<string, unknown> }],
      ];
      expect(args.where).toMatchObject({ userId: 'staff1', removedAt: null });
    });

    it('ยังไม่ถูกมอบหมายร้านใด → บอกให้ติดต่อเจ้าของร้าน', async () => {
      prisma.shopStaff.findMany.mockResolvedValue([]);

      await expect(resolve('เพิ่มโค้ก10')).rejects.toThrow('ติดต่อเจ้าของร้าน');
    });
  });
});

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { AdminService } from './admin.service';
import { UserRole, UserStatus } from '../database/generated/prisma/enums';

/** expect.any() คืน any — ห่อให้เป็น unknown เพื่อไม่ให้ชน no-unsafe-assignment */
const anyDate = (): unknown => expect.any(Date);

/** อ่านอาร์กิวเมนต์ตัวแรกของการเรียก mock ครั้งแรกแบบมี type */
function firstArg<T>(mock: jest.Mock): T {
  const calls = mock.mock.calls as unknown as unknown[][];
  return calls[0][0] as T;
}

const ADMIN = '0199a0e0-0000-7000-8000-00000000000a';
const OTHER_ADMIN = '0199a0e0-0000-7000-8000-00000000000b';
const SUPER = '0199a0e0-0000-7000-8000-00000000000c';
const OWNER = '0199a0e0-0000-7000-8000-000000000001';
const SHOP = '0199a0e0-0000-7000-8000-000000000010';

type Actor = { id: string; role: UserRole; status: UserStatus };

function user(id: string, role: UserRole, status = UserStatus.ACTIVE): Actor {
  return { id, role, status };
}

describe('AdminService', () => {
  let prisma: {
    user: Record<string, jest.Mock>;
    shop: Record<string, jest.Mock>;
    refreshToken: { updateMany: jest.Mock };
    adminAuditLog: { create: jest.Mock };
    product: { count: jest.Mock };
    subscriptionPlan: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let bcrypt: { hash: jest.Mock };
  let service: AdminService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation((args: { data: unknown }) => ({
          id: 'new-admin',
          ...(args.data as Record<string, unknown>),
        })),
        update: jest.fn(),
      },
      shop: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
      },
      refreshToken: { updateMany: jest.fn() },
      adminAuditLog: { create: jest.fn() },
      product: { count: jest.fn().mockResolvedValue(0) },
      subscriptionPlan: { findMany: jest.fn().mockResolvedValue([]) },
      // $transaction ในโค้ดจริงรับเป็น array ของ promise — mock ให้ resolve ตามลำดับ
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    };
    bcrypt = { hash: jest.fn().mockResolvedValue('hashed') };
    service = new AdminService(prisma as never, bcrypt as never);
  });

  /** ให้ requireUser() คืน actor/target ตามลำดับที่ service เรียก */
  function expectLookups(...users: Actor[]) {
    for (const u of users) {
      prisma.user.findUnique.mockResolvedValueOnce(u);
    }
  }

  describe('suspendUser', () => {
    it('ห้ามระงับบัญชีตัวเอง', async () => {
      expectLookups(user(ADMIN, UserRole.ADMIN), user(ADMIN, UserRole.ADMIN));

      await expect(
        service.suspendUser(ADMIN, ADMIN, 'ผิดเงื่อนไข'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    // กันกรณีแอดมินระงับกันเองจนไม่เหลือใครปลดล็อกได้
    it('ห้ามระงับบัญชี Super Admin ไม่ว่าใครสั่ง', async () => {
      expectLookups(
        user(SUPER, UserRole.SUPER_ADMIN),
        user(OTHER_ADMIN, UserRole.SUPER_ADMIN),
      );

      await expect(
        service.suspendUser(SUPER, OTHER_ADMIN, 'ผิดเงื่อนไข'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    // SRS §198 — อำนาจเหนือบัญชี Admin เป็นของ Super Admin เท่านั้น
    it('Admin ธรรมดาระงับ Admin ด้วยกันไม่ได้', async () => {
      expectLookups(
        user(ADMIN, UserRole.ADMIN),
        user(OTHER_ADMIN, UserRole.ADMIN),
      );

      await expect(
        service.suspendUser(ADMIN, OTHER_ADMIN, 'ผิดเงื่อนไข'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('Super Admin ระงับ Admin ได้', async () => {
      expectLookups(
        user(SUPER, UserRole.SUPER_ADMIN),
        user(OTHER_ADMIN, UserRole.ADMIN),
      );

      await service.suspendUser(SUPER, OTHER_ADMIN, 'ผิดเงื่อนไข');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: OTHER_ADMIN },
        data: { status: UserStatus.SUSPENDED },
      });
    });

    it('ระงับเจ้าของร้านแล้วเตะ session ทิ้งพร้อมลงบันทึกในทรานแซกชันเดียว', async () => {
      expectLookups(
        user(ADMIN, UserRole.ADMIN),
        user(OWNER, UserRole.SHOP_OWNER),
      );

      await service.suspendUser(ADMIN, OWNER, 'ผิดเงื่อนไข');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: OWNER, revokedAt: null },
        data: { revokedAt: anyDate() },
      });
      expect(prisma.adminAuditLog.create).toHaveBeenCalled();
    });

    it('ปฏิเสธเมื่อบัญชีถูกระงับอยู่แล้ว', async () => {
      expectLookups(
        user(ADMIN, UserRole.ADMIN),
        user(OWNER, UserRole.SHOP_OWNER, UserStatus.SUSPENDED),
      );

      await expect(
        service.suspendUser(ADMIN, OWNER, 'ซ้ำ'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('ตอบ 404 เมื่อไม่พบบัญชีเป้าหมาย', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(user(ADMIN, UserRole.ADMIN))
        .mockResolvedValueOnce(null);

      await expect(
        service.suspendUser(ADMIN, OWNER, 'x'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('createAdmin (SRS §29/§186)', () => {
    const DTO = {
      firstName: 'วิภา',
      lastName: 'ตั้งเจน',
      email: 'wipa.admin@example.com',
      password: 'Str0ng!pass',
    };

    it('ปฏิเสธเมื่ออีเมลนี้มีคนใช้แล้ว', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'someone' });

      await expect(service.createAdmin(SUPER, DTO)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    // เทียบแบบไม่สนตัวพิมพ์ ไม่งั้น Wipa@x.com กับ wipa@x.com จะกลายเป็นคนละบัญชี
    it('เช็คอีเมลซ้ำแบบไม่สนตัวพิมพ์ใหญ่เล็ก', async () => {
      await service.createAdmin(SUPER, DTO);

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: { equals: DTO.email, mode: 'insensitive' },
            deletedAt: null,
          }) as unknown,
        }),
      );
    });

    it('ไม่เก็บรหัสผ่านดิบลงฐานข้อมูล', async () => {
      await service.createAdmin(SUPER, DTO);

      expect(bcrypt.hash).toHaveBeenCalledWith(DTO.password);
      const arg = firstArg<{ data: { password: string } }>(prisma.user.create);
      expect(arg.data.password).toBe('hashed');
    });

    // login() บล็อกบัญชีที่มีอีเมลแต่ยังไม่ยืนยัน ถ้าไม่ตั้งให้ตั้งแต่แรก
    // บัญชีที่ Super Admin เพิ่งสร้างจะล็อกอินไม่ได้เลยสักครั้ง
    it('ถือว่าอีเมลยืนยันแล้ว และได้ role ADMIN เสมอ', async () => {
      await service.createAdmin(SUPER, DTO);

      const arg = firstArg<{ data: { role: string; emailVerifiedAt: Date } }>(
        prisma.user.create,
      );
      expect(arg.data.role).toBe('ADMIN');
      expect(arg.data.emailVerifiedAt).toBeInstanceOf(Date);
    });

    it('ลงบันทึกไว้ในประวัติผู้ดูแล', async () => {
      await service.createAdmin(SUPER, DTO);

      expect(prisma.adminAuditLog.create).toHaveBeenCalled();
    });
  });

  describe('updateAdminRole (SRS §198 — Super Admin เท่านั้น)', () => {
    it('ห้ามเปลี่ยน role ของตัวเอง', async () => {
      expectLookups(user(SUPER, UserRole.SUPER_ADMIN));

      await expect(
        service.updateAdminRole(SUPER, SUPER, UserRole.ADMIN),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('ใช้กับบัญชีที่ไม่ใช่ Admin ไม่ได้', async () => {
      expectLookups(user(OWNER, UserRole.SHOP_OWNER));

      await expect(
        service.updateAdminRole(SUPER, OWNER, UserRole.ADMIN),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('ปฏิเสธเมื่อ role เดิมตรงกับที่ขอเปลี่ยนอยู่แล้ว', async () => {
      expectLookups(user(OTHER_ADMIN, UserRole.ADMIN));

      await expect(
        service.updateAdminRole(SUPER, OTHER_ADMIN, UserRole.ADMIN),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('เลื่อน Admin เป็น Super Admin ได้พร้อมลงบันทึก', async () => {
      expectLookups(user(OTHER_ADMIN, UserRole.ADMIN));

      await service.updateAdminRole(SUPER, OTHER_ADMIN, UserRole.SUPER_ADMIN);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: OTHER_ADMIN },
        data: { role: UserRole.SUPER_ADMIN },
      });
      expect(prisma.adminAuditLog.create).toHaveBeenCalled();
    });
  });

  describe('ร้านค้า (SRS §197)', () => {
    it('ระงับร้านค้าแล้วเปลี่ยน status เป็น SUSPENDED', async () => {
      prisma.shop.findFirst.mockResolvedValue({ id: SHOP, status: 'ACTIVE' });

      await service.suspendShop(ADMIN, SHOP, 'ผิดเงื่อนไข');

      expect(prisma.shop.update).toHaveBeenCalledWith({
        where: { id: SHOP },
        data: { status: 'SUSPENDED' },
      });
    });

    it('ปฏิเสธการระงับร้านที่ถูกระงับอยู่แล้ว', async () => {
      prisma.shop.findFirst.mockResolvedValue({
        id: SHOP,
        status: 'SUSPENDED',
      });

      await expect(
        service.suspendShop(ADMIN, SHOP, 'ซ้ำ'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('ปลดระงับร้านค้ากลับเป็น ACTIVE', async () => {
      prisma.shop.findFirst.mockResolvedValue({
        id: SHOP,
        status: 'SUSPENDED',
      });

      await service.reactivateShop(ADMIN, SHOP);

      expect(prisma.shop.update).toHaveBeenCalledWith({
        where: { id: SHOP },
        data: { status: 'ACTIVE' },
      });
    });
  });

  describe('listUsers', () => {
    it('คำนวณ skip/take จาก page/limit และคืน meta', async () => {
      prisma.user.count.mockResolvedValue(45);

      const result = await service.listUsers({ page: 3, limit: 20 });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 }),
      );
      expect(result.meta).toEqual({
        page: 3,
        limit: 20,
        total: 45,
        totalPages: 3,
      });
    });

    it('ค้นหาครอบทั้งชื่อ อีเมล และ username', async () => {
      await service.listUsers({ page: 1, limit: 20, q: 'praew' });

      const { where } = firstArg<{ where: { OR: unknown[] } }>(
        prisma.user.findMany,
      );
      expect(where.OR).toHaveLength(4);
    });
  });
});

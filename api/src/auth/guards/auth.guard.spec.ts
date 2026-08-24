import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { TokenExpiredError } from '@nestjs/jwt';

import { AuthGuard } from './auth.guard';

const USER_ID = '0199a0e0-0000-7000-8000-000000000001';

function contextWith(authorization?: string) {
  const request: Record<string, unknown> = {
    headers: authorization ? { authorization } : {},
  };
  return {
    request,
    ctx: {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => undefined,
      getClass: () => undefined,
    },
  };
}

describe('AuthGuard', () => {
  let accessToken: { verify: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };
  let prisma: { user: { findFirst: jest.Mock } };
  let guard: AuthGuard;

  beforeEach(() => {
    accessToken = {
      verify: jest.fn().mockResolvedValue({ sub: USER_ID, role: 'SHOP_OWNER' }),
    };
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    prisma = {
      user: { findFirst: jest.fn().mockResolvedValue({ status: 'ACTIVE' }) },
    };
    guard = new AuthGuard(
      accessToken as never,
      reflector as never,
      prisma as never,
    );
  });

  it('ปล่อยผ่าน route ที่เป็น @Public() โดยไม่แตะ DB เลย', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const { ctx } = contextWith();

    await expect(guard.canActivate(ctx as never)).resolves.toBe(true);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('ปฏิเสธเมื่อไม่มี Authorization header', async () => {
    const { ctx } = contextWith();

    await expect(guard.canActivate(ctx as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('ปฏิเสธเมื่อ token หมดอายุ', async () => {
    accessToken.verify.mockRejectedValue(
      new TokenExpiredError('jwt expired', new Date()),
    );
    const { ctx } = contextWith('Bearer token');

    await expect(guard.canActivate(ctx as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('ผ่านและใส่ payload ลง request เมื่อบัญชียังใช้งานได้', async () => {
    const { ctx, request } = contextWith('Bearer token');

    await expect(guard.canActivate(ctx as never)).resolves.toBe(true);
    expect(request.user).toEqual({ sub: USER_ID, role: 'SHOP_OWNER' });
  });

  // access token เพิกถอนกลางคันไม่ได้ ถ้าไม่เช็คสถานะบัญชีที่นี่ พนักงานที่
  // เพิ่งถูกลบจะยังยิง API ได้จนกว่า token ในมือจะหมดอายุ
  describe('เช็คสถานะบัญชีต่อจากลายเซ็น', () => {
    it('ปฏิเสธ token ของบัญชีที่ถูก soft delete แล้ว', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      const { ctx } = contextWith('Bearer token');

      await expect(guard.canActivate(ctx as never)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('ปฏิเสธ token ของบัญชีที่ถูกระงับ', async () => {
      prisma.user.findFirst.mockResolvedValue({ status: 'SUSPENDED' });
      const { ctx } = contextWith('Bearer token');

      await expect(guard.canActivate(ctx as never)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('กรอง deletedAt ตั้งแต่ใน query ไม่ใช่มากรองทีหลัง', async () => {
      const { ctx } = contextWith('Bearer token');

      await guard.canActivate(ctx as never);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: USER_ID, deletedAt: null },
        select: { status: true },
      });
    });
  });
});

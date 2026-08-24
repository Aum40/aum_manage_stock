import { NotFoundException } from '@nestjs/common';
import {
  NotificationsService,
  NOTIFICATION_TYPE,
} from './notifications.service';
import type { PrismaService } from '../database/prisma.service';
import type { AccountContextService } from '../common/access/account-context.service';

const USER = '0199a0e0-0000-7000-8000-000000000001';
const OTHER = '0199a0e0-0000-7000-8000-0000000000ee';
const SHOP_ID = '0199a0e0-0000-7000-8000-0000000000aa';

function createPrismaMock() {
  return {
    notification: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

const containing = (shape: Record<string, unknown>): unknown =>
  expect.objectContaining(shape);

const anyDate = (): unknown => expect.any(Date);

describe('NotificationsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let accountContext: { resolve: jest.Mock };
  let service: NotificationsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    accountContext = {
      resolve: jest
        .fn()
        .mockResolvedValue({ userId: USER, ownerId: USER, isStaff: false }),
    };
    service = new NotificationsService(
      prisma as unknown as PrismaService,
      accountContext as unknown as AccountContextService,
    );
  });

  describe('findAll', () => {
    it('คืนเฉพาะการแจ้งเตือนของผู้ใช้คนนั้น เรียงใหม่สุดก่อน', async () => {
      prisma.$transaction.mockResolvedValue([[], 0, 0]);

      await service.findAll(USER, { page: 1, limit: 20 });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        containing({
          where: containing({ userId: USER }),
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('unreadOnly กรองเฉพาะที่ยังไม่อ่าน', async () => {
      prisma.$transaction.mockResolvedValue([[], 0, 0]);

      await service.findAll(USER, { page: 1, limit: 20, unreadOnly: true });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        containing({ where: containing({ userId: USER, readAt: null }) }),
      );
    });

    it('คืน unreadCount แยกจาก total ที่ถูกกรองแล้ว', async () => {
      prisma.$transaction.mockResolvedValue([[{ id: 'n1' }], 1, 7]);

      const result = await service.findAll(USER, {
        page: 1,
        limit: 20,
        unreadOnly: true,
      });

      expect(result.meta.total).toBe(1);
      expect(result.meta.unreadCount).toBe(7);
    });

    it('พนักงานเห็นของตัวเอง ไม่ใช่ของเจ้าของร้าน', async () => {
      accountContext.resolve.mockResolvedValue({
        userId: OTHER,
        ownerId: USER,
        isStaff: true,
      });
      prisma.$transaction.mockResolvedValue([[], 0, 0]);

      await service.findAll(OTHER, { page: 1, limit: 20 });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        containing({ where: containing({ userId: OTHER }) }),
      );
    });
  });

  describe('markAsRead', () => {
    it('ตั้ง readAt เมื่อยังไม่เคยอ่าน', async () => {
      prisma.notification.findFirst.mockResolvedValue({
        id: 'n1',
        readAt: null,
      });
      prisma.notification.update.mockResolvedValue({
        id: 'n1',
        readAt: new Date(),
      });

      await service.markAsRead(USER, 'n1');

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: { readAt: anyDate() },
        select: { id: true, readAt: true },
      });
    });

    it('อ่านซ้ำไม่เขียนทับเวลาเดิม', async () => {
      const readAt = new Date('2026-08-01T00:00:00.000Z');
      prisma.notification.findFirst.mockResolvedValue({ id: 'n1', readAt });

      const result = await service.markAsRead(USER, 'n1');

      expect(prisma.notification.update).not.toHaveBeenCalled();
      expect(result.readAt).toBe(readAt);
    });

    it('การแจ้งเตือนของคนอื่น -> 404', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead(USER, 'n1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('อัปเดตเฉพาะที่ยังไม่อ่านของผู้ใช้คนนั้น', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead(USER);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: USER, readAt: null },
        data: { readAt: anyDate() },
      });
      expect(result.updated).toBe(3);
    });
  });

  describe('create', () => {
    it('dedupeWhileUnread ไม่สร้างซ้ำถ้ายังมีใบเดิมค้างไม่อ่าน', async () => {
      prisma.notification.findFirst.mockResolvedValue({ id: 'existing' });

      const result = await service.create({
        userId: USER,
        type: NOTIFICATION_TYPE.PRODUCT_LIMIT_REACHED,
        title: 'เต็มโควตา',
        message: 'อัปเกรดแพ็กเกจ',
        dedupeWhileUnread: true,
      });

      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(result.id).toBe('existing');
    });

    it('สร้างใหม่เมื่อใบเดิมถูกอ่านไปแล้ว', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);
      prisma.notification.create.mockResolvedValue({ id: 'n2' });

      await service.create({
        userId: USER,
        shopId: SHOP_ID,
        type: NOTIFICATION_TYPE.LOW_STOCK,
        title: 'สต็อกใกล้หมด',
        message: 'โค้ก 325ml เหลือ 2 ชิ้น',
        dedupeWhileUnread: true,
      });

      expect(prisma.notification.create).toHaveBeenCalledWith(
        containing({
          data: containing({ userId: USER, shopId: SHOP_ID }),
        }),
      );
    });
  });

  describe('emit', () => {
    it('สร้างแจ้งเตือนไม่สำเร็จต้องไม่โยน error ออกไปให้ผู้เรียก', async () => {
      prisma.notification.create.mockRejectedValue(new Error('db down'));

      await expect(
        service.emit({
          userId: USER,
          type: NOTIFICATION_TYPE.PRODUCT_LIMIT_REACHED,
          title: 'เต็มโควตา',
          message: 'อัปเกรดแพ็กเกจ',
        }),
      ).resolves.toBeUndefined();
    });
  });
});

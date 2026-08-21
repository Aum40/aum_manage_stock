import { ZodError } from 'zod';
import type { PrismaService } from '../database/prisma.service';
import type { ChatAccessService } from './chat-access.service';
import { ChatbotService } from './chatbot.service';

type PrismaMock = {
  chatMessage: { create: jest.Mock; findMany: jest.Mock };
  pendingStockAction: {
    create: jest.Mock;
    update: jest.Mock;
    findFirst: jest.Mock;
  };
  shopProduct: { findMany: jest.Mock };
};

const OWNER = '0199a0e0-0000-7000-8000-000000000001';
const SHOP = '0199a0e0-0000-7000-8000-000000000010';
const SHOP_PRODUCT = '0199a0e0-0000-7000-8000-000000000020';

const containing = (shape: Record<string, unknown>): unknown =>
  expect.objectContaining(shape);

function createPrismaMock(): PrismaMock {
  return {
    chatMessage: { create: jest.fn(), findMany: jest.fn() },
    pendingStockAction: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    shopProduct: { findMany: jest.fn() },
  };
}

describe('ChatbotService', () => {
  let prisma: PrismaMock;
  let chatAccess: {
    assertCanUseChatbot: jest.Mock;
    assertCanViewChat: jest.Mock;
  };
  let llm: { parseStockCommand: jest.Mock };
  let service: ChatbotService;

  beforeEach(() => {
    prisma = createPrismaMock();
    chatAccess = {
      assertCanUseChatbot: jest
        .fn()
        .mockResolvedValue({ userId: OWNER, ownerId: OWNER, isStaff: false }),
      assertCanViewChat: jest
        .fn()
        .mockResolvedValue({ userId: OWNER, ownerId: OWNER, isStaff: false }),
    };
    llm = { parseStockCommand: jest.fn() };

    prisma.shopProduct.findMany.mockResolvedValue([
      { id: SHOP_PRODUCT, product: { name: 'โค้ก 325ml', unit: 'กระป๋อง' } },
    ]);
    prisma.chatMessage.create.mockResolvedValue({ id: 'm1' });
    prisma.pendingStockAction.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => ({ id: 'pa1', ...data }),
    );

    service = new ChatbotService(
      prisma as unknown as PrismaService,
      chatAccess as unknown as ChatAccessService,
      llm,
    );
  });

  describe('sendMessage — ตีความคำสั่ง', () => {
    it('เก็บ PENDING เมื่อ LLM ตีความสำเร็จและสินค้าอยู่ในร้าน', async () => {
      llm.parseStockCommand.mockResolvedValue({
        items: [
          {
            shopProductId: SHOP_PRODUCT,
            productName: 'โค้ก 325ml',
            qtyChange: 10,
          },
        ],
      });

      const result = await service.sendMessage(OWNER, SHOP, 'เพิ่มโค้ก10');

      expect(prisma.pendingStockAction.create).toHaveBeenCalledWith({
        data: containing({ shopId: SHOP, status: 'PENDING', channel: 'WEB' }),
      });
      expect(result.reply).toContain('โค้ก 325ml');
      expect(result.reply).toContain('ยืนยัน');
    });

    it('เป็น FAILED เมื่อ LLM อ้างถึงสินค้าที่ไม่ได้อยู่ในร้านนี้', async () => {
      llm.parseStockCommand.mockResolvedValue({
        items: [
          {
            shopProductId: 'ไม่มีอยู่จริง',
            productName: 'เป๊ปซี่',
            qtyChange: 5,
          },
        ],
      });

      await service.sendMessage(OWNER, SHOP, 'เพิ่มเป๊ปซี่5');

      expect(prisma.pendingStockAction.create).toHaveBeenCalledWith({
        data: containing({ status: 'FAILED' }),
      });
    });

    it('เป็น FAILED เมื่อ LLM คืน JSON ที่ผิดโครงสร้าง (ZodError)', async () => {
      llm.parseStockCommand.mockRejectedValue(
        new ZodError([
          {
            code: 'invalid_type',
            expected: 'array',
            path: ['items'],
            message: 'invalid',
          },
        ]),
      );

      const result = await service.sendMessage(OWNER, SHOP, 'เพิ่มโค้ก10');

      expect(prisma.pendingStockAction.create).toHaveBeenCalledWith({
        data: containing({ status: 'FAILED' }),
      });
      expect(result.reply).toContain('❌');
    });

    it('ไม่รับ qtyChange = 0', async () => {
      llm.parseStockCommand.mockResolvedValue({
        items: [
          {
            shopProductId: SHOP_PRODUCT,
            productName: 'โค้ก 325ml',
            qtyChange: 0,
          },
        ],
      });

      await service.sendMessage(OWNER, SHOP, 'เพิ่มโค้ก0');

      expect(prisma.pendingStockAction.create).toHaveBeenCalledWith({
        data: containing({ status: 'FAILED' }),
      });
    });
  });

  describe('sendMessage — ยืนยัน', () => {
    it('mark CONFIRMED เมื่อมีรายการรออยู่และยังไม่หมดอายุ', async () => {
      prisma.pendingStockAction.findFirst.mockResolvedValue({
        id: 'pa1',
        expiresAt: new Date(Date.now() + 60_000),
        parsedItems: [
          {
            shopProductId: SHOP_PRODUCT,
            productName: 'โค้ก 325ml',
            qtyChange: 10,
          },
        ],
      });
      prisma.pendingStockAction.update.mockResolvedValue({
        id: 'pa1',
        status: 'CONFIRMED',
      });

      const result = await service.sendMessage(OWNER, SHOP, 'ยืนยัน');

      expect(prisma.pendingStockAction.update).toHaveBeenCalledWith({
        where: { id: 'pa1' },
        data: containing({ status: 'CONFIRMED' }),
      });
      expect(result.reply).toContain('✅');
    });

    it('mark EXPIRED และไม่ยืนยันให้ เมื่อรายการหมดอายุแล้ว', async () => {
      prisma.pendingStockAction.findFirst.mockResolvedValue({
        id: 'pa1',
        expiresAt: new Date(Date.now() - 60_000),
        parsedItems: [],
      });
      prisma.pendingStockAction.update.mockResolvedValue({ id: 'pa1' });

      const result = await service.sendMessage(OWNER, SHOP, 'ยืนยัน');

      expect(prisma.pendingStockAction.update).toHaveBeenCalledWith({
        where: { id: 'pa1' },
        data: { status: 'EXPIRED' },
      });
      expect(result.reply).toContain('หมดอายุ');
    });

    it('บอกผู้ใช้เมื่อไม่มีรายการรอยืนยัน', async () => {
      prisma.pendingStockAction.findFirst.mockResolvedValue(null);

      const result = await service.sendMessage(OWNER, SHOP, 'ยืนยัน');

      expect(prisma.pendingStockAction.update).not.toHaveBeenCalled();
      expect(result.reply).toContain('ไม่มีรายการ');
    });

    it('ยกเลิกได้', async () => {
      prisma.pendingStockAction.findFirst.mockResolvedValue({
        id: 'pa1',
        expiresAt: new Date(Date.now() + 60_000),
        parsedItems: [],
      });
      prisma.pendingStockAction.update.mockResolvedValue({ id: 'pa1' });

      await service.sendMessage(OWNER, SHOP, 'ยกเลิก');

      expect(prisma.pendingStockAction.update).toHaveBeenCalledWith({
        where: { id: 'pa1' },
        data: { status: 'CANCELLED' },
      });
    });
  });

  describe('การตรวจสิทธิ์', () => {
    it('ต้องผ่าน assertCanUseChatbot ก่อนเรียก LLM เสมอ', async () => {
      chatAccess.assertCanUseChatbot.mockRejectedValue(new Error('denied'));

      await expect(
        service.sendMessage(OWNER, SHOP, 'เพิ่มโค้ก10'),
      ).rejects.toThrow('denied');

      expect(llm.parseStockCommand).not.toHaveBeenCalled();
      expect(prisma.chatMessage.create).not.toHaveBeenCalled();
    });

    it('listMessages ใช้สิทธิ์ระดับ view และกรองตามผู้ใช้', async () => {
      prisma.chatMessage.findMany.mockResolvedValue([]);

      await service.listMessages(OWNER, SHOP, { limit: 50 });

      expect(chatAccess.assertCanViewChat).toHaveBeenCalledWith(OWNER, SHOP);
      expect(prisma.chatMessage.findMany).toHaveBeenCalledWith(
        containing({ where: { shopId: SHOP, userId: OWNER } }),
      );
    });
  });
});

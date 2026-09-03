import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LineUserMessageError } from '../line-user-message.error';
import { LineIdentityPort, LineIdentityResult } from './line-identity.port';

type ResolvedShop = { id: string; name: string };

@Injectable()
export class PrismaLineIdentityAdapter implements LineIdentityPort {
  private readonly logger = new Logger(PrismaLineIdentityAdapter.name);

  constructor(private readonly prisma: PrismaService) {}

  async resolve(input: {
    destination: string;
    lineUserId: string;
    message: string;
  }): Promise<LineIdentityResult> {
    const user = await this.prisma.user.findFirst({
      where: { lineUserId: input.lineUserId, deletedAt: null },
      select: { id: true, role: true, status: true },
    });

    if (!user) {
      // log id ไว้เพื่อให้ผูกบัญชีได้ — ไม่มีทางอื่นที่จะรู้ว่า lineUserId ของคนที่ทักมาคืออะไร
      this.logger.warn(
        `ไม่พบบัญชีที่ผูกกับ lineUserId=${input.lineUserId} (ผูกด้วย: pnpm exec ts-node --transpile-only scripts/link-line-user.ts <email|username> ${input.lineUserId})`,
      );

      throw new LineUserMessageError(
        'บัญชี LINE นี้ยังไม่ได้ผูกกับระบบ กรุณาเข้าเว็บแล้วผูกบัญชี LINE ที่หน้าโปรไฟล์ก่อน',
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new LineUserMessageError(
        'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
      );
    }

    const shops = await this.loadShops(user.id, user.role === 'SHOP_STAFF');

    if (shops.length === 0) {
      throw new LineUserMessageError(
        user.role === 'SHOP_STAFF'
          ? 'คุณยังไม่ได้รับมอบหมายให้ดูแลร้านใด กรุณาติดต่อเจ้าของร้าน'
          : 'บัญชีนี้ยังไม่มีร้านค้า กรุณาสร้างร้านในเว็บก่อน',
      );
    }

    if (shops.length === 1) {
      return {
        kind: 'RESOLVED',
        shopId: shops[0].id,
        actorId: user.id,
        message: input.message,
      };
    }

    return this.resolveAmongManyShops(shops, user.id, input.message);
  }

  /**
   * บัญชีเดียวอาจมีหลายร้าน แต่ข้อความ LINE ไม่ได้บอกว่าหมายถึงร้านไหน
   * (บอทเป็นตัวเดียวทั้งแพลตฟอร์ม destination จึงซ้ำกันทุกร้าน ใช้แยกไม่ได้)
   * จึงให้ผู้ใช้พิมพ์ชื่อร้านนำหน้า แล้วตัดชื่อร้านออกก่อนส่งต่อให้ตัวตีความ
   */
  private resolveAmongManyShops(
    shops: ResolvedShop[],
    actorId: string,
    message: string,
  ): LineIdentityResult {
    const normalized = message.trim();
    const matched = shops
      .filter((shop) =>
        normalized.toLowerCase().startsWith(shop.name.trim().toLowerCase()),
      )
      // ชื่อร้านที่ยาวกว่าตรงกว่า กันกรณี "ร้าน" กับ "ร้านสาขา2" ชนกัน
      .sort((a, b) => b.name.length - a.name.length)[0];

    if (!matched) {
      /**
       * [อั้ม] เดิมโยน error ทิ้งตรงนี้ บังคับให้ผู้ใช้พิมพ์ชื่อร้านนำหน้าเอง
       * ซึ่งต้องจำชื่อร้านให้ตรงเป๊ะ ตอนนี้คืนรายชื่อร้านออกไปให้ผู้เรียกถาม
       * เป็นตัวเลือกมีเลขกำกับแทน (ทางลัดพิมพ์ชื่อร้านนำหน้ายังใช้ได้เหมือนเดิม
       * ตามเงื่อนไข matched ข้างบน)
       */
      return { kind: 'NEEDS_SHOP', actorId, message, shops };
    }

    const rest = normalized.slice(matched.name.trim().length).trim();

    if (!rest) {
      throw new LineUserMessageError(
        `ได้รับชื่อร้าน "${matched.name}" แล้ว แต่ยังไม่มีคำสั่ง\n\nตัวอย่าง: "${matched.name} เพิ่มโค้ก 10"`,
      );
    }

    return { kind: 'RESOLVED', shopId: matched.id, actorId, message: rest };
  }

  private async loadShops(
    userId: string,
    isStaff: boolean,
  ): Promise<ResolvedShop[]> {
    if (isStaff) {
      const assignments = await this.prisma.shopStaff.findMany({
        where: {
          userId,
          removedAt: null,
          shop: { deletedAt: null, status: 'ACTIVE' },
        },
        select: { shop: { select: { id: true, name: true } } },
      });

      return assignments.map((assignment) => assignment.shop);
    }

    return this.prisma.shop.findMany({
      where: { ownerId: userId, deletedAt: null, status: 'ACTIVE' },
      select: { id: true, name: true },
    });
  }

  /**
   * แปลงเลขที่ผู้ใช้พิมพ์กลับเป็นร้าน — โหลดรายชื่อร้านใหม่แล้วตรวจสิทธิ์ซ้ำทุกครั้ง
   * ไม่เชื่อรายการที่เคยส่งไป เพราะระหว่างรอผู้ใช้ตอบ ร้านอาจถูกลบ ถูกพัก หรือ
   * พนักงานอาจถูกถอดออกจากร้านไปแล้ว
   */
  async selectShop(input: {
    actorId: string;
    index: number;
  }): Promise<{ shopId: string; shopName: string } | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: input.actorId, deletedAt: null },
      select: { id: true, role: true },
    });

    if (!user) return null;

    const shops = await this.loadShops(user.id, user.role === 'SHOP_STAFF');
    const chosen = shops[input.index - 1];

    return chosen ? { shopId: chosen.id, shopName: chosen.name } : null;
  }
}

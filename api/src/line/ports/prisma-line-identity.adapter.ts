import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LineUserMessageError } from '../line-user-message.error';
import { LineIdentityPort } from './line-identity.port';

type ResolvedShop = { id: string; name: string };

@Injectable()
export class PrismaLineIdentityAdapter implements LineIdentityPort {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(input: {
    destination: string;
    lineUserId: string;
    message: string;
  }): Promise<{ shopId: string; actorId?: string; message: string }> {
    const user = await this.prisma.user.findFirst({
      where: { lineUserId: input.lineUserId, deletedAt: null },
      select: { id: true, role: true, status: true },
    });

    if (!user) {
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
      return { shopId: shops[0].id, actorId: user.id, message: input.message };
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
  ): { shopId: string; actorId: string; message: string } {
    const normalized = message.trim();
    const matched = shops
      .filter((shop) =>
        normalized.toLowerCase().startsWith(shop.name.trim().toLowerCase()),
      )
      // ชื่อร้านที่ยาวกว่าตรงกว่า กันกรณี "ร้าน" กับ "ร้านสาขา2" ชนกัน
      .sort((a, b) => b.name.length - a.name.length)[0];

    if (!matched) {
      const list = shops.map((shop) => `• ${shop.name}`).join('\n');
      throw new LineUserMessageError(
        `บัญชีนี้มีหลายร้าน กรุณาพิมพ์ชื่อร้านนำหน้าคำสั่งด้วย\n\nร้านของคุณ:\n${list}\n\nตัวอย่าง: "${shops[0].name} เพิ่มโค้ก 10"`,
      );
    }

    const rest = normalized.slice(matched.name.trim().length).trim();

    if (!rest) {
      throw new LineUserMessageError(
        `ได้รับชื่อร้าน "${matched.name}" แล้ว แต่ยังไม่มีคำสั่ง\n\nตัวอย่าง: "${matched.name} เพิ่มโค้ก 10"`,
      );
    }

    return { shopId: matched.id, actorId, message: rest };
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
}

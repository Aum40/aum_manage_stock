import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../database/generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * หมวดหมู่ผูกกับเจ้าของร้าน ไม่ได้ผูกกับร้าน -> เจ้าของที่มีหลายร้านใช้ชุดเดียวกันทุกร้าน
   *
   * TODO(staff): เมื่อ feature/staff-resource merge แล้ว ต้องเช็ค
   * `staff_permissions.can_manage_product` ก่อนอนุญาตให้พนักงานสร้าง/แก้ไข
   * ส่วนการลบสงวนไว้ให้เจ้าของร้านเท่านั้น
   */
  async create(ownerId: string, dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({
        data: {
          ownerId,
          name: dto.name,
          displayOrder: dto.displayOrder ?? 0,
        },
      });
    } catch (error) {
      throw this.toHttpError(error, dto.name);
    }
  }

  findAll(ownerId: string) {
    return this.prisma.category.findMany({
      where: { ownerId },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async update(ownerId: string, id: string, dto: UpdateCategoryDto) {
    if (dto.name === undefined && dto.displayOrder === undefined) {
      throw new BadRequestException('ต้องระบุอย่างน้อย 1 ฟิลด์ที่ต้องการแก้ไข');
    }

    await this.findOwnedOrFail(ownerId, id);

    try {
      return await this.prisma.category.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.displayOrder !== undefined && {
            displayOrder: dto.displayOrder,
          }),
        },
      });
    } catch (error) {
      throw this.toHttpError(error, dto.name);
    }
  }

  /** hard delete ตามที่ตกลงไว้ - สินค้าที่อยู่ในหมวดนี้ไม่ถูกลบตาม แค่ category_id กลายเป็น NULL */
  async remove(ownerId: string, id: string) {
    await this.findOwnedOrFail(ownerId, id);
    await this.prisma.category.delete({ where: { id } });
  }

  /**
   * ตอบ 404 ทั้งกรณีไม่มีจริงและกรณีเป็นของเจ้าของคนอื่น
   * เพื่อไม่ให้ผู้เรียกเดาได้ว่า id ไหนมีอยู่ในระบบบ้าง
   */
  private async findOwnedOrFail(ownerId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, ownerId },
    });

    if (!category) {
      throw new NotFoundException('ไม่พบหมวดหมู่ที่ต้องการ');
    }

    return category;
  }

  private toHttpError(error: unknown, name?: string): Error {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException(
        name === undefined
          ? 'มีหมวดหมู่ชื่อนี้อยู่แล้ว'
          : `มีหมวดหมู่ชื่อ "${name}" อยู่แล้ว`,
      );
    }

    return error instanceof Error ? error : new Error(String(error));
  }
}

import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateCategoryDto } from './dto/category.dto';
import { Prisma } from '@/database/generated/prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

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
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('มีหมวดหมู่ชื่อนี้อยู่แล้ว');
      }
      throw error;
    }
  }
}

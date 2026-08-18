import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { Category } from '@/database/generated/prisma/client';
import { isUniqueConstraintViolation } from '@/common/utils/prisma-error.util';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    ownerId: string,
    dto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    try {
      const category = await this.prisma.category.create({
        data: {
          ownerId,
          name: dto.name,
          displayOrder: dto.displayOrder ?? 0,
        },
      });

      return this.toResponseDto(category);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('Category name already exists');
      }
      throw error;
    }
  }

  async findAll(ownerId: string): Promise<CategoryResponseDto[]> {
    const categories = await this.prisma.category.findMany({
      where: { ownerId },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });

    return categories.map((category) => this.toResponseDto(category));
  }

  async update(
    ownerId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    await this.findOwnedOrFail(ownerId, id);

    try {
      const category = await this.prisma.category.update({
        where: { id },
        data: {
          name: dto.name,
          displayOrder: dto.displayOrder,
        },
      });

      return this.toResponseDto(category);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('Category name already exists');
      }
      throw error;
    }
  }

  async remove(ownerId: string, id: string): Promise<void> {
    await this.findOwnedOrFail(ownerId, id);

    await this.prisma.category.delete({ where: { id } });
  }

  /**
   * Categories belong to the shop owner rather than to a shop, so every lookup
   * is scoped by ownerId. A category owned by someone else is reported as not
   * found so callers cannot probe which ids exist.
   */
  private async findOwnedOrFail(
    ownerId: string,
    id: string,
  ): Promise<Category> {
    const category = await this.prisma.category.findFirst({
      where: { id, ownerId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  private toResponseDto(category: Category): CategoryResponseDto {
    return {
      id: category.id,
      ownerId: category.ownerId,
      name: category.name,
      displayOrder: category.displayOrder,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}

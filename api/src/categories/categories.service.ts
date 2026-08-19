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
   * Categories belong to the shop owner rather than to a shop, so an owner
   * with several shops shares one set across all of them.
   *
   * TODO(staff): once feature/staff-resource merges, check
   * `staff_permissions.can_manage_product` before letting a staff member
   * create or update. Deleting stays owner-only.
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
      throw new BadRequestException('At least one field must be provided');
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

  /** Hard delete. Products in this category survive; their category_id becomes NULL. */
  async remove(ownerId: string, id: string) {
    await this.findOwnedOrFail(ownerId, id);
    await this.prisma.category.delete({ where: { id } });
  }

  /**
   * Answers 404 both when the category does not exist and when it belongs to
   * another owner, so callers cannot probe which ids are in the system.
   */
  private async findOwnedOrFail(ownerId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, ownerId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
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
          ? 'Category name already exists'
          : `Category "${name}" already exists`,
      );
    }

    return error instanceof Error ? error : new Error(String(error));
  }
}

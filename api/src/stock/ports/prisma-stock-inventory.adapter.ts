import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../database/generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { uuidSchema } from '../../common/validation/schemas';
import { StockInventoryPort } from './stock-inventory.port';

@Injectable()
export class PrismaStockInventoryAdapter implements StockInventoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async resolveProduct(shopId: string, productQuery: string) {
    const query = productQuery.trim();
    const matches = await this.prisma.shopProduct.findMany({
      where: {
        shopId,
        status: 'ACTIVE',
        product: { deletedAt: null },
        ...(uuidSchema.safeParse(query).success
          ? { id: query }
          : {
              product: {
                deletedAt: null,
                OR: [
                  { barcode: query },
                  { name: { contains: query, mode: 'insensitive' } },
                ],
              },
            }),
      },
      select: { id: true },
      take: 2,
    });
    if (matches.length === 0)
      throw new NotFoundException('Shop product not found');
    if (matches.length > 1)
      throw new ConflictException('Product query is ambiguous');
    return { shopProductId: matches[0].id };
  }

  async adjustStock(
    tx: Prisma.TransactionClient,
    input: { shopId: string; shopProductId: string; quantityDelta: number },
  ) {
    const updated = await tx.shopProduct.updateMany({
      where: {
        id: input.shopProductId,
        shopId: input.shopId,
        status: 'ACTIVE',
        ...(input.quantityDelta < 0
          ? { stockQty: { gte: -input.quantityDelta } }
          : {}),
      },
      data: { stockQty: { increment: input.quantityDelta } },
    });
    if (updated.count !== 1) {
      const product = await tx.shopProduct.findFirst({
        where: {
          id: input.shopProductId,
          shopId: input.shopId,
          status: 'ACTIVE',
        },
        select: { id: true },
      });
      if (!product)
        throw new NotFoundException('Active shop product not found');
      throw new ConflictException('Insufficient stock');
    }
    const product = await tx.shopProduct.findUniqueOrThrow({
      where: { id: input.shopProductId },
      select: { stockQty: true },
    });
    return {
      quantityBefore: product.stockQty - input.quantityDelta,
      quantityAfter: product.stockQty,
    };
  }
}

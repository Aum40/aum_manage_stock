import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../database/generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { isSubscriptionReadOnly } from '../../subscriptions/subscription-quota.util';
import {
  STOCK_INVENTORY_PORT,
  type StockInventoryPort,
} from '../../stock/ports/stock-inventory.port';
import { SalesSubscriptionPort } from './sales-access.port';
import { SalesProductPort, type SellableProduct } from './sales-product.port';

@Injectable()
export class PrismaSalesProductAdapter implements SalesProductPort {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STOCK_INVENTORY_PORT)
    private readonly inventory: StockInventoryPort,
  ) {}

  async scan(shopId: string, barcode: string) {
    const products = await this.prisma.shopProduct.findMany({
      where: {
        shopId,
        status: 'ACTIVE',
        product: { barcode, deletedAt: null },
      },
      include: { product: { select: { name: true } } },
      take: 2,
    });
    if (products.length === 0)
      throw new NotFoundException('Product barcode not found');
    if (products.length > 1)
      throw new ForbiddenException('Barcode is ambiguous for this shop');
    return this.snapshot(products[0]);
  }

  async getForSale(
    tx: Prisma.TransactionClient,
    shopId: string,
    shopProductId: string,
  ) {
    const product = await tx.shopProduct.findFirst({
      where: {
        id: shopProductId,
        shopId,
        status: 'ACTIVE',
        product: { deletedAt: null },
      },
      include: { product: { select: { name: true } } },
    });
    if (!product) throw new NotFoundException('Active shop product not found');
    return this.snapshot(product);
  }

  adjustStock(
    tx: Prisma.TransactionClient,
    input: { shopId: string; shopProductId: string; quantityDelta: number },
  ) {
    return this.inventory.adjustStock(tx, input);
  }

  private snapshot(product: {
    id: string;
    sellPrice: Prisma.Decimal;
    product: { name: string };
  }): SellableProduct {
    return {
      shopProductId: product.id,
      name: product.product.name,
      unitPrice: product.sellPrice,
    };
  }
}

@Injectable()
export class PrismaSalesSubscriptionAdapter implements SalesSubscriptionPort {
  async assertSalesEnabled(tx: Prisma.TransactionClient, shopId: string) {
    const shop = await tx.shop.findFirst({
      where: { id: shopId, deletedAt: null, status: 'ACTIVE' },
      select: {
        owner: {
          select: {
            subscription: { select: { status: true, expiresAt: true } },
          },
        },
      },
    });
    if (!shop) throw new NotFoundException('Active shop not found');
    const subscription = shop.owner.subscription;
    if (!subscription || isSubscriptionReadOnly(subscription)) {
      throw new ForbiddenException('Subscription does not allow sales changes');
    }
  }
}

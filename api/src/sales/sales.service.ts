import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import type { CreateSaleDto, SaleQueryDto } from './dto/sales.dto';
import {
  SALES_PRODUCT_PORT,
  type SalesProductPort,
} from './ports/sales-product.port';
import {
  SALES_STAFF_PORT,
  SALES_SUBSCRIPTION_PORT,
  type SalesStaffPort,
  type SalesSubscriptionPort,
} from './ports/sales-access.port';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly movements: StockMovementsService,
    @Inject(SALES_PRODUCT_PORT) private readonly products: SalesProductPort,
    @Inject(SALES_STAFF_PORT) private readonly staff: SalesStaffPort,
    @Inject(SALES_SUBSCRIPTION_PORT)
    private readonly subscriptions: SalesSubscriptionPort,
  ) {}

  scan(shopId: string, staffId: string, barcode: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.assertAccess(tx, shopId, staffId);
      return this.products.scan(shopId, barcode);
    });
  }

  create(shopId: string, staffId: string, input: CreateSaleDto) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.assertAccess(tx, shopId, staffId);
        const requested = new Map<string, number>();
        for (const item of input.items)
          requested.set(
            item.shopProductId,
            (requested.get(item.shopProductId) ?? 0) + item.quantity,
          );

        const items = [];
        let total = new Prisma.Decimal(0);
        for (const [shopProductId, quantity] of requested) {
          const product = await this.products.getForSale(
            tx,
            shopId,
            shopProductId,
          );
          const lineTotal = product.unitPrice.mul(quantity);
          total = total.add(lineTotal);
          items.push({ ...product, quantity, lineTotal });
        }

        const sale = await tx.sale.create({
          data: {
            shopId,
            staffId,
            totalAmount: total,
            note: input.note,
            items: {
              create: items.map(
                ({ shopProductId, name, unitPrice, quantity, lineTotal }) => ({
                  shopProductId,
                  productName: name,
                  unitPrice,
                  quantity,
                  lineTotal,
                }),
              ),
            },
          },
          include: { items: true },
        });

        for (const item of items) {
          const stock = await this.products.adjustStock(tx, {
            shopId,
            shopProductId: item.shopProductId,
            quantityDelta: -item.quantity,
          });
          await this.movements.create(tx, {
            shopId,
            shopProductId: item.shopProductId,
            actorId: staffId,
            movementType: 'SALE',
            quantityDelta: -item.quantity,
            quantityBefore: stock.quantityBefore,
            quantityAfter: stock.quantityAfter,
            source: 'WEB',
            referenceType: 'SALE_ITEM',
            referenceId: sale.items.find(
              (created) => created.shopProductId === item.shopProductId,
            )!.id,
          });
        }
        return sale;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  list(shopId: string, staffId: string, query: SaleQueryDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.assertAccess(tx, shopId, staffId);
      const rows = await tx.sale.findMany({
        where: { shopId },
        include: { items: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: query.limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      });
      const hasMore = rows.length > query.limit;
      const items = hasMore ? rows.slice(0, query.limit) : rows;
      return { items, nextCursor: hasMore ? items.at(-1)?.id : null };
    });
  }

  get(shopId: string, staffId: string, saleId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.assertAccess(tx, shopId, staffId);
      const sale = await tx.sale.findFirst({
        where: { id: saleId, shopId },
        include: { items: true },
      });
      if (!sale) throw new NotFoundException('Sale not found');
      return sale;
    });
  }

  void(shopId: string, staffId: string, saleId: string, reason: string) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.assertAccess(tx, shopId, staffId);
        const sale = await tx.sale.findFirst({
          where: { id: saleId, shopId },
          include: { items: true },
        });
        if (!sale) throw new NotFoundException('Sale not found');
        if (sale.status === 'VOIDED')
          throw new ConflictException('Sale is already voided');

        for (const item of sale.items) {
          const stock = await this.products.adjustStock(tx, {
            shopId,
            shopProductId: item.shopProductId,
            quantityDelta: item.quantity,
          });
          await this.movements.create(tx, {
            shopId,
            shopProductId: item.shopProductId,
            actorId: staffId,
            movementType: 'SALE_VOID',
            quantityDelta: item.quantity,
            quantityBefore: stock.quantityBefore,
            quantityAfter: stock.quantityAfter,
            source: 'WEB',
            note: reason,
            referenceType: 'SALE_VOID_ITEM',
            referenceId: item.id,
          });
        }
        return tx.sale.update({
          where: { id: sale.id },
          data: {
            status: 'VOIDED',
            voidedById: staffId,
            voidReason: reason,
            voidedAt: new Date(),
          },
          include: { items: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async assertAccess(
    tx: Prisma.TransactionClient,
    shopId: string,
    staffId: string,
  ) {
    await this.staff.assertCanManageSales(tx, { shopId, staffId });
    await this.subscriptions.assertSalesEnabled(tx, shopId);
  }
}

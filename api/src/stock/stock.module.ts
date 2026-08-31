import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { STOCK_AUTHORIZATION_PORT } from './ports/stock-authorization.port';
import { STOCK_INVENTORY_PORT } from './ports/stock-inventory.port';
import { PrismaStockInventoryAdapter } from './ports/prisma-stock-inventory.adapter';
import { PrismaStockAuthorizationAdapter } from './ports/prisma-stock-authorization.adapter';

@Module({
  imports: [NotificationsModule],
  controllers: [StockController],
  providers: [
    StockService,
    StockMovementsService,
    {
      provide: STOCK_INVENTORY_PORT,
      useClass: PrismaStockInventoryAdapter,
    },
    {
      provide: STOCK_AUTHORIZATION_PORT,
      useClass: PrismaStockAuthorizationAdapter,
    },
  ],
  exports: [
    StockService,
    StockMovementsService,
    STOCK_INVENTORY_PORT,
    STOCK_AUTHORIZATION_PORT,
  ],
})
export class StockModule {}

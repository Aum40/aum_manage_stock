import { Module } from '@nestjs/common';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { STOCK_AUTHORIZATION_PORT } from './ports/stock-authorization.port';
import { STOCK_INVENTORY_PORT } from './ports/stock-inventory.port';
import {
  UnavailableStockAuthorizationAdapter,
  UnavailableStockInventoryAdapter,
} from './ports/unavailable-adapters';

@Module({
  controllers: [StockController],
  providers: [
    StockService,
    StockMovementsService,
    {
      provide: STOCK_INVENTORY_PORT,
      useClass: UnavailableStockInventoryAdapter,
    },
    {
      provide: STOCK_AUTHORIZATION_PORT,
      useClass: UnavailableStockAuthorizationAdapter,
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

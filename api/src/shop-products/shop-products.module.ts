import { Module } from '@nestjs/common';
import { ShopProductsController } from './shop-products.controller';
import { ShopProductsService } from './shop-products.service';

@Module({
  controllers: [ShopProductsController],
  providers: [ShopProductsService],
  exports: [ShopProductsService],
})
export class ShopProductsModule {}

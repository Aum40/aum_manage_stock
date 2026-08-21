import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatCommandModule } from './chat-command/chat-command.module';
import { DatabaseModule } from './database/database.module';
import { LineModule } from './line/line.module';
import { StockModule } from './stock/stock.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { PaymentsModule } from './payments/payments.module';
import { CategoriesModule } from './categories/categories.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ShopsModule } from './shops/shops.module';
import { CommonModule } from './common/common.module';
import { ProductsModule } from './products/products.module';
import { ShopProductsModule } from './shop-products/shop-products.module';
import { StaffModule } from './staff/staff.module';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    AdminModule,
    PaymentsModule,
    CategoriesModule,
    SubscriptionsModule,
    ShopsModule,
    // [เซิ่น]
    CommonModule,
    ProductsModule,
    ShopProductsModule,
    StockModule,
    ChatCommandModule,
    LineModule,
    StaffModule,
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ChatCommandModule } from './chat-command/chat-command.module';
import { ChatModule } from './chat/chat.module';
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
import { NotificationsModule } from './notifications/notifications.module';
import { StaffModule } from './staff/staff.module';
import { AiRecommendationsModule } from './ai-recommendations/ai-recommendations.module';
import { validate } from './config/env.validation';
import { HashModule } from './infrastructure/hash/hash.module';
import { JwtModule } from './infrastructure/jwt/jwt.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { MailModule } from './infrastructure/mail/mail.module';
import { EncryptionModule } from './infrastructure/encryption/encryption.module';
import { OAuthModule } from './infrastructure/oauth/oauth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    ScheduleModule.forRoot(),
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
    NotificationsModule,
    StockModule,
    ChatCommandModule,
    ChatModule,
    LineModule,
    StaffModule,
    AiRecommendationsModule,
    HashModule,
    JwtModule,
    MailModule,
    EncryptionModule,
    OAuthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

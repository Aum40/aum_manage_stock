import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CategoriesModule } from './categories/categories.module';
import { validate } from './config/env.validation';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    DatabaseModule,
    CategoriesModule,
  ],
})
export class AppModule {}

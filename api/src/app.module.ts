import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatCommandModule } from './chat-command/chat-command.module';
import { DatabaseModule } from './database/database.module';
import { LineModule } from './line/line.module';
import { StockModule } from './stock/stock.module';
import { validateEnvironment } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    StockModule,
    ChatCommandModule,
    LineModule,
  ],
})
export class AppModule {}

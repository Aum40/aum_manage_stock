import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module';
import { ChatCommandController } from './chat-command.controller';
import { ChatCommandService } from './chat-command.service';
import { DeterministicStockCommandParser } from './parsers/deterministic-stock-command.parser';
import { STOCK_COMMAND_PARSER } from './parsers/stock-command-parser';

@Module({
  imports: [StockModule],
  controllers: [ChatCommandController],
  providers: [
    ChatCommandService,
    {
      provide: STOCK_COMMAND_PARSER,
      useClass: DeterministicStockCommandParser,
    },
  ],
  exports: [ChatCommandService],
})
export class ChatCommandModule {}

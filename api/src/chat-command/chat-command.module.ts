import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module';
import { ChatCommandController } from './chat-command.controller';
import { ChatCommandService } from './chat-command.service';
import { DeterministicStockCommandParser } from './parsers/deterministic-stock-command.parser';
import { FallbackStockCommandParser } from './parsers/fallback-stock-command.parser';
import { LlmStockCommandParser } from './parsers/llm-stock-command.parser';
import { STOCK_COMMAND_PARSER } from './parsers/stock-command-parser';

@Module({
  imports: [StockModule],
  controllers: [ChatCommandController],
  providers: [
    ChatCommandService,
    // [อั้ม] feature/chatbot-resource — เสียบ LLM parser เข้า port เดิม
    // FallbackStockCommandParser ลอง LLM ก่อน ถ้าล้ม/ไม่ได้ตั้ง env จะตกไปใช้
    // DeterministicStockCommandParser เสมอ พฤติกรรมเดิมจึงไม่ regress
    DeterministicStockCommandParser,
    LlmStockCommandParser,
    {
      provide: STOCK_COMMAND_PARSER,
      useClass: FallbackStockCommandParser,
    },
  ],
  exports: [ChatCommandService],
})
export class ChatCommandModule {}

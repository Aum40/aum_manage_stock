import { Injectable, Logger } from '@nestjs/common';
import { DeterministicStockCommandParser } from './deterministic-stock-command.parser';
import { LlmStockCommandParser } from './llm-stock-command.parser';
import { ParsedStockCommand, StockCommandParser } from './stock-command-parser';

@Injectable()
export class FallbackStockCommandParser implements StockCommandParser {
  private readonly logger = new Logger(FallbackStockCommandParser.name);

  constructor(
    private readonly llm: LlmStockCommandParser,
    private readonly deterministic: DeterministicStockCommandParser,
  ) {}

  async parse(message: string): Promise<ParsedStockCommand> {
    if (!this.llm.isEnabled()) {
      return this.deterministic.parse(message);
    }

    try {
      return await this.llm.parse(message);
    } catch (error) {
      this.logger.warn(
        `LLM parse failed, falling back to deterministic parser: ${String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      return this.deterministic.parse(message);
    }
  }
}

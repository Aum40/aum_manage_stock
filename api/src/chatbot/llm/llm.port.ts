import type { LlmParseResult } from '../dto/chat.dto';

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');

export interface CatalogEntry {
  shopProductId: string;
  productName: string;
  unit: string;
}

export interface LlmProvider {
  parseStockCommand(
    rawText: string,
    catalog: CatalogEntry[],
  ): Promise<LlmParseResult>;
}

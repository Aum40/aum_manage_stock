export const STOCK_COMMAND_PARSER = Symbol('STOCK_COMMAND_PARSER');

export interface ParsedStockCommand {
  intent: 'ADJUST_STOCK';
  operation: 'INCREASE' | 'DECREASE';
  productQuery: string;
  quantity: number;
}

export interface StockCommandParser {
  parse(message: string): Promise<ParsedStockCommand>;
}

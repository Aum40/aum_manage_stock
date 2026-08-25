import { Injectable, Logger } from '@nestjs/common';
import type { GeneratedRecommendation } from '../dto/ai-recommendation.dto';
import { LlmRecommendationGenerator } from './llm-recommendation.generator';
import { RuleBasedRecommendationGenerator } from './rule-based-recommendation.generator';
import type {
  RecommendationGenerator,
  ShopMetric,
} from './recommendation-generator.port';

@Injectable()
export class FallbackRecommendationGenerator implements RecommendationGenerator {
  private readonly logger = new Logger(FallbackRecommendationGenerator.name);

  constructor(
    private readonly llm: LlmRecommendationGenerator,
    private readonly ruleBased: RuleBasedRecommendationGenerator,
  ) {}

  async generate(metrics: ShopMetric[]): Promise<GeneratedRecommendation[]> {
    if (!this.llm.isEnabled()) {
      return this.ruleBased.generate(metrics);
    }

    try {
      const result = await this.llm.generate(metrics);

      // LLM ตอบว่างอาจแปลว่าไม่มีประเด็นจริง หรือตอบพลาด — ใช้กฎยืนยันอีกชั้น
      // ไม่ให้แดชบอร์ดว่างเปล่าทั้งที่มีของใกล้หมด
      return result.length > 0
        ? result
        : await this.ruleBased.generate(metrics);
    } catch (error) {
      this.logger.warn(
        `LLM generate failed, falling back to rule-based: ${String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      return this.ruleBased.generate(metrics);
    }
  }
}

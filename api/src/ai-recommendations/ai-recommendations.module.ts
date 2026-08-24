import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { AiAccessService } from './ai-access.service';
import { AiRecommendationsController } from './ai-recommendations.controller';
import { AiRecommendationsGateway } from './ai-recommendations.gateway';
import { AiRecommendationsService } from './ai-recommendations.service';
import { FallbackRecommendationGenerator } from './ports/fallback-recommendation.generator';
import { LlmRecommendationGenerator } from './ports/llm-recommendation.generator';
import { RECOMMENDATION_GENERATOR } from './ports/recommendation-generator.port';
import { RuleBasedRecommendationGenerator } from './ports/rule-based-recommendation.generator';

@Module({
  // AuthModule ให้ AccessTokenService ไว้ตรวจ JWT ตอน WebSocket handshake
  imports: [AuthModule],
  controllers: [AiRecommendationsController],
  providers: [
    AiRecommendationsService,
    AiAccessService,
    AiRecommendationsGateway,
    // FallbackRecommendationGenerator ลอง LLM ก่อน ถ้าล้ม/ไม่ได้ตั้ง env
    // จะตกไปใช้กฎเสมอ แดชบอร์ดจึงไม่เคยว่างเปล่าแม้ Ollama ล่ม
    LlmRecommendationGenerator,
    RuleBasedRecommendationGenerator,
    {
      provide: RECOMMENDATION_GENERATOR,
      useClass: FallbackRecommendationGenerator,
    },
  ],
})
export class AiRecommendationsModule {}

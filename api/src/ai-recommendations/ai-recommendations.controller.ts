import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { CurrentUser } from '@/common/decorator/current-user.decorator';
import { AiRecommendationsService } from './ai-recommendations.service';
import {
  listRecommendationsQuerySchema,
  type ListRecommendationsQueryDto,
} from './dto/ai-recommendation.dto';

@Controller()
export class AiRecommendationsController {
  constructor(private readonly service: AiRecommendationsService) {}

  @Get('shops/:shopId/ai/recommendations')
  list(
    @CurrentUser('sub') userId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Query(new ZodValidationPipe(listRecommendationsQuerySchema))
    query: ListRecommendationsQueryDto,
  ) {
    return this.service.list(userId, shopId, query);
  }

  @Post('shops/:shopId/ai/recommendations/generate')
  generate(
    @CurrentUser('sub') userId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
  ) {
    return this.service.generate(userId, shopId);
  }

  @Patch('ai/recommendations/:id/dismiss')
  dismiss(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.dismiss(userId, id);
  }
}

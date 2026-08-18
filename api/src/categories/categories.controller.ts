import { Body, Controller, Headers, Post } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(
    @Headers('x-user-id') ownerId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(ownerId, dto);
  }
}

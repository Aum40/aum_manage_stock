import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { MessageResponseDto } from '@/common/dto/message-response.dto';
import { OwnerId } from '@/common/decorators/owner-id.decorator';

@ApiHeader({
  name: 'x-user-id',
  description: 'Shop owner id. Temporary stand-in until AuthGuard lands.',
  required: true,
})
@ApiBadRequestResponse({
  description: 'Validation failed, or the x-user-id header is missing',
})
@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiConflictResponse({
    description: 'This owner already has a category with the same name',
  })
  @Post()
  async create(
    @OwnerId() ownerId: string,
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoryService.create(ownerId, dto);
  }

  @Get()
  async findAll(@OwnerId() ownerId: string): Promise<CategoryResponseDto[]> {
    return this.categoryService.findAll(ownerId);
  }

  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiConflictResponse({
    description: 'This owner already has a category with the same name',
  })
  @Patch(':id')
  async update(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoryService.update(ownerId, id, dto);
  }

  @ApiNotFoundResponse({ description: 'Category not found' })
  @Delete(':id')
  async remove(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    await this.categoryService.remove(ownerId, id);
    return { message: 'Category deleted successfully' };
  }
}

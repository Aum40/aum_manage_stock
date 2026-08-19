import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OwnerId } from '../common/decorators/owner-id.decorator';
import { CategoriesService } from './categories.service';
import {
  CategoryResponseDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/category.dto';

@ApiTags('categories')
@ApiHeader({
  name: 'x-user-id',
  description:
    'Shop owner id. Temporary stand-in for the JWT until feature/auth-resource merges.',
  required: true,
  example: '0198f3c2-6b4a-7c31-9d55-2f8a4c1e7b60',
})
@ApiBadRequestResponse({ description: 'The request payload is invalid' })
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a category' })
  @ApiCreatedResponse({ description: 'Created', type: CategoryResponseDto })
  @ApiConflictResponse({
    description: 'This owner already has a category with the same name',
  })
  create(@OwnerId() ownerId: string, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(ownerId, dto);
  }

  @Get()
  @ApiOperation({
    summary: "List the owner's categories, shared across all of their shops",
  })
  @ApiOkResponse({ type: CategoryResponseDto, isArray: true })
  findAll(@OwnerId() ownerId: string) {
    return this.categoriesService.findAll(ownerId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a category or change its display order' })
  @ApiOkResponse({ description: 'Updated', type: CategoryResponseDto })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiConflictResponse({
    description: 'This owner already has a category with the same name',
  })
  update(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(ownerId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a category permanently; its products are kept',
  })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  remove(@OwnerId() ownerId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.remove(ownerId, id);
  }
}

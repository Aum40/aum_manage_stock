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
    'UUID ของเจ้าของร้าน (ใช้ชั่วคราวแทน JWT จนกว่า feature/auth-resource จะ merge)',
  required: true,
  example: '0198f3c2-6b4a-7c31-9d55-2f8a4c1e7b60',
})
@ApiBadRequestResponse({ description: 'ข้อมูลที่ส่งมาไม่ถูกต้อง' })
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'สร้างหมวดหมู่ใหม่' })
  @ApiCreatedResponse({ description: 'สร้างสำเร็จ', type: CategoryResponseDto })
  @ApiConflictResponse({ description: 'ชื่อหมวดหมู่ซ้ำกับที่มีอยู่แล้ว' })
  create(@OwnerId() ownerId: string, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(ownerId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'ดูหมวดหมู่ทั้งหมดของเจ้าของร้าน (ใช้ร่วมกันทุกร้าน)',
  })
  @ApiOkResponse({ type: CategoryResponseDto, isArray: true })
  findAll(@OwnerId() ownerId: string) {
    return this.categoriesService.findAll(ownerId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'แก้ไขชื่อหรือลำดับการแสดงผลของหมวดหมู่' })
  @ApiOkResponse({ description: 'แก้ไขสำเร็จ', type: CategoryResponseDto })
  @ApiNotFoundResponse({ description: 'ไม่พบหมวดหมู่ที่ต้องการ' })
  @ApiConflictResponse({ description: 'ชื่อหมวดหมู่ซ้ำกับที่มีอยู่แล้ว' })
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
    summary: 'ลบหมวดหมู่ถาวร (สินค้าในหมวดนี้ไม่ถูกลบตาม)',
  })
  @ApiNoContentResponse({ description: 'ลบสำเร็จ' })
  @ApiNotFoundResponse({ description: 'ไม่พบหมวดหมู่ที่ต้องการ' })
  remove(@OwnerId() ownerId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.remove(ownerId, id);
  }
}

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
  Query,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { OwnerId } from '../common/decorator/owner-id.decorator';
import {
  CreateProductSchema,
  ListProductQuerySchema,
  SearchByBarcodeSchema,
  UpdateProductSchema,
  type CreateProductDto,
  type ListProductQueryDto,
  type SearchByBarcodeDto,
  type UpdateProductDto,
} from './dto/product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(
    @OwnerId() userId: string,
    @Body(new ZodValidationPipe(CreateProductSchema)) dto: CreateProductDto,
  ) {
    return this.productsService.create(userId, dto);
  }

  @Get()
  findAll(
    @OwnerId() userId: string,
    @Query(new ZodValidationPipe(ListProductQuerySchema))
    query: ListProductQueryDto,
  ) {
    return this.productsService.findAll(userId, query);
  }

  @Get('search')
  findByBarcode(
    @OwnerId() userId: string,
    @Query(new ZodValidationPipe(SearchByBarcodeSchema))
    query: SearchByBarcodeDto,
  ) {
    return this.productsService.findByBarcode(userId, query.barcode);
  }

  @Get(':id')
  findOne(@OwnerId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(userId, id);
  }

  @Patch(':id')
  update(
    @OwnerId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateProductSchema)) dto: UpdateProductDto,
  ) {
    return this.productsService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@OwnerId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(userId, id);
  }
}

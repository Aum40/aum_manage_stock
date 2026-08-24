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
import { CurrentUser } from '../common/decorator/current-user.decorator';
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
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(CreateProductSchema)) dto: CreateProductDto,
  ) {
    return this.productsService.create(userId, dto);
  }

  @Get()
  findAll(
    @CurrentUser('sub') userId: string,
    @Query(new ZodValidationPipe(ListProductQuerySchema))
    query: ListProductQueryDto,
  ) {
    return this.productsService.findAll(userId, query);
  }

  @Get('search')
  findByBarcode(
    @CurrentUser('sub') userId: string,
    @Query(new ZodValidationPipe(SearchByBarcodeSchema))
    query: SearchByBarcodeDto,
  ) {
    return this.productsService.findByBarcode(userId, query.barcode);
  }

  @Get(':id')
  findOne(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.findOne(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateProductSchema)) dto: UpdateProductDto,
  ) {
    return this.productsService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.remove(userId, id);
  }
}

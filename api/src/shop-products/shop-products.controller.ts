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
  AddShopProductSchema,
  ListShopProductQuerySchema,
  UpdateShopProductSchema,
  type AddShopProductDto,
  type ListShopProductQueryDto,
  type UpdateShopProductDto,
} from './dto/shop-product.dto';
import { ShopProductsService } from './shop-products.service';

@Controller('shops/:shopId/products')
export class ShopProductsController {
  constructor(private readonly shopProductsService: ShopProductsService) {}

  @Post()
  add(
    @CurrentUser('sub') userId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body(new ZodValidationPipe(AddShopProductSchema)) dto: AddShopProductDto,
  ) {
    return this.shopProductsService.add(userId, shopId, dto);
  }

  @Get()
  findAll(
    @CurrentUser('sub') userId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Query(new ZodValidationPipe(ListShopProductQuerySchema))
    query: ListShopProductQueryDto,
  ) {
    return this.shopProductsService.findAll(userId, shopId, query);
  }

  @Get('low-stock')
  findLowStock(
    @CurrentUser('sub') userId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
  ) {
    return this.shopProductsService.findLowStock(userId, shopId);
  }

  @Get(':shopProductId')
  findOne(
    @CurrentUser('sub') userId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('shopProductId', ParseUUIDPipe) shopProductId: string,
  ) {
    return this.shopProductsService.findOne(userId, shopId, shopProductId);
  }

  @Patch(':shopProductId')
  update(
    @CurrentUser('sub') userId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('shopProductId', ParseUUIDPipe) shopProductId: string,
    @Body(new ZodValidationPipe(UpdateShopProductSchema))
    dto: UpdateShopProductDto,
  ) {
    return this.shopProductsService.update(userId, shopId, shopProductId, dto);
  }

  @Delete(':shopProductId')
  @HttpCode(HttpStatus.OK)
  remove(
    @CurrentUser('sub') userId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('shopProductId', ParseUUIDPipe) shopProductId: string,
  ) {
    return this.shopProductsService.remove(userId, shopId, shopProductId);
  }
}

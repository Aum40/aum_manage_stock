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
import { OwnerId } from '../common/decorators/owner-id.decorator';
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

  /** เลือกสินค้าจากคลังกลางมาขายที่ร้านนี้ + ตั้งราคาขาย/ต้นทุนของร้านนี้ */
  @Post()
  add(
    @OwnerId() ownerId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body(new ZodValidationPipe(AddShopProductSchema)) dto: AddShopProductDto,
  ) {
    return this.shopProductsService.add(ownerId, shopId, dto);
  }

  @Get()
  findAll(
    @OwnerId() ownerId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Query(new ZodValidationPipe(ListShopProductQuerySchema))
    query: ListShopProductQueryDto,
  ) {
    return this.shopProductsService.findAll(ownerId, shopId, query);
  }

  /** สินค้าที่ stock_qty <= low_stock_threshold — ต้องประกาศก่อน :shopProductId */
  @Get('low-stock')
  findLowStock(
    @OwnerId() ownerId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
  ) {
    return this.shopProductsService.findLowStock(ownerId, shopId);
  }

  @Get(':shopProductId')
  findOne(
    @OwnerId() ownerId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('shopProductId', ParseUUIDPipe) shopProductId: string,
  ) {
    return this.shopProductsService.findOne(ownerId, shopId, shopProductId);
  }

  /** แก้ราคาขาย/ต้นทุน/threshold เฉพาะร้านนี้ — ห้ามแก้ stock ทางนี้ */
  @Patch(':shopProductId')
  update(
    @OwnerId() ownerId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('shopProductId', ParseUUIDPipe) shopProductId: string,
    @Body(new ZodValidationPipe(UpdateShopProductSchema))
    dto: UpdateShopProductDto,
  ) {
    return this.shopProductsService.update(ownerId, shopId, shopProductId, dto);
  }

  /** เลิกขายที่ร้านนี้ — ไม่กระทบร้านอื่นและไม่ลบประวัติ */
  @Delete(':shopProductId')
  @HttpCode(HttpStatus.OK)
  remove(
    @OwnerId() ownerId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('shopProductId', ParseUUIDPipe) shopProductId: string,
  ) {
    return this.shopProductsService.remove(ownerId, shopId, shopProductId);
  }
}

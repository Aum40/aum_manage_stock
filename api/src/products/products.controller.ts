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

  /** เพิ่มสินค้าเข้าคลังกลาง — เช็คโควตาสินค้า active ตามแพ็กเกจก่อนเสมอ */
  @Post()
  create(
    @OwnerId() ownerId: string,
    @Body(new ZodValidationPipe(CreateProductSchema)) dto: CreateProductDto,
  ) {
    return this.productsService.create(ownerId, dto);
  }

  /** คลังสินค้าทั้งหมดของเจ้าของร้าน (ไม่รวมที่ soft delete แล้ว) */
  @Get()
  findAll(
    @OwnerId() ownerId: string,
    @Query(new ZodValidationPipe(ListProductQuerySchema))
    query: ListProductQueryDto,
  ) {
    return this.productsService.findAll(ownerId, query);
  }

  /**
   * ค้นด้วยบาร์โค้ด — คืนสินค้าชิ้นเดียว เพราะบาร์โค้ด unique ระดับ owner
   * ต้องประกาศก่อน :id ไม่งั้น 'search' จะถูกจับเป็น id
   */
  @Get('search')
  findByBarcode(
    @OwnerId() ownerId: string,
    @Query(new ZodValidationPipe(SearchByBarcodeSchema))
    query: SearchByBarcodeDto,
  ) {
    return this.productsService.findByBarcode(ownerId, query.barcode);
  }

  @Get(':id')
  findOne(@OwnerId() ownerId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(ownerId, id);
  }

  @Patch(':id')
  update(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateProductSchema)) dto: UpdateProductDto,
  ) {
    return this.productsService.update(ownerId, id, dto);
  }

  /** soft delete จากคลังกลาง + หยุดขายสินค้านี้ในทุกร้าน */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@OwnerId() ownerId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(ownerId, id);
  }
}

# shop-products (เซิ่น)

Branch: `feature/shop-products-resource` — **stack ต่อจาก `feature/products-resource`**
(ไม่ได้แตกจาก `dev` โดยตรง เพราะ `ShopProduct` ต้องอ้าง `Product` model)

## Endpoints

| Method | Path | หมายเหตุ |
|---|---|---|
| POST | `/shops/:shopId/products` | body: `productId, sellPrice, costPrice, lowStockThreshold` — สต็อกเริ่มที่ 0 เสมอ |
| GET | `/shops/:shopId/products` | `?q=&status=&page=&limit=` |
| GET | `/shops/:shopId/products/low-stock` | `stock_qty <= low_stock_threshold` |
| GET | `/shops/:shopId/products/:shopProductId` | |
| PATCH | `/shops/:shopId/products/:shopProductId` | body: `sellPrice, costPrice, lowStockThreshold` — **ห้ามแก้ stock** |
| DELETE | `/shops/:shopId/products/:shopProductId` | เลิกขายเฉพาะร้านนี้ (set `INACTIVE` ไม่ลบแถว) |

## สิ่งที่ branch นี้เพิ่มทับของ products

- `enum ShopProductStatus` + `model ShopProduct` ใน `schema.prisma`
- back-relation `shopProducts ShopProduct[]` ใน `model Product`
- `ProductsService.remove()` เปลี่ยนเป็นปิดการขายทุกร้านพร้อม soft delete ในทรานแซกชันเดียว
- `SHOP_ACCESS_PROVIDER` ใน `common.module.ts`
- `assertCanManageShopProducts(ownerId, shopId)` — ยังไม่รับ `userId` จนกว่า staff จะมา

## การตัดสินใจที่ต่างจาก ERD (ตกลงกับทีมแล้ว)

1. **`cost_price` อยู่ที่ `shop_products`** ไม่ใช่ `products` — ตาม SRS ("ข้อมูลระดับร้าน…ราคาขาย ต้นทุน…")
   แต่ละสาขารับของคนละยี่ปั๊ว ต้นทุนไม่เท่ากัน และ `sale_items.cost_price_snapshot` ของดิวต้องอ่านจากตรงนี้
   (endpoint sheet ฉบับล่าสุดมี `costPrice` ใน body แล้ว ส่วน ERD ยังไม่อัปเดตตาม)
2. **DELETE = set `status = INACTIVE`** ไม่ลบแถว เพราะ `stock_movements` / `sale_items`
   อ้าง `shop_product_id` อยู่ ถ้าลบจริงประวัติจะขาด — และ `POST` ซ้ำจะเปิดขายแถวเดิมกลับมา ไม่สร้างแถวใหม่

## จุดที่ต้องแก้ตอน merge

- `schema.prisma`: ปลด comment relation `shop` ใน `ShopProduct` เมื่อ `feature/shops-resource` เข้ามา
- `common/common.module.ts`: เปลี่ยน `SHOP_ACCESS_PROVIDER` จาก `AllowAllShopAccessAdapter`
  → adapter ที่เช็ค `shops.owner_id` จริง และเมื่อ staff มาแล้วให้เพิ่ม `userId`
  เข้า signature เพื่อเช็ค `staff_permissions.canManageProduct`

## smoke test

รันได้หลัง `pnpm start:dev` (ครอบทั้ง products และ shop-products)

```bash
node scripts/smoke-test.mjs
```

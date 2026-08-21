# shop-products (เซิ่น)

สินค้าที่แต่ละร้านเลือกมาขาย — ราคาขาย / ต้นทุน / สต็อก / low-stock threshold / สถานะ
แยกตามร้าน ส่วนตัวสินค้าเองอยู่ในคลังกลางที่ `../products`

สถานะ: **merged เข้า `dev` แล้ว** (PR #9)

## Endpoints

| Method | Path | หมายเหตุ |
|---|---|---|
| POST | `/shops/:shopId/products` | body: `productId, sellPrice, costPrice, lowStockThreshold` — สต็อกเริ่มที่ 0 เสมอ |
| GET | `/shops/:shopId/products` | `?q=&status=&page=&limit=` |
| GET | `/shops/:shopId/products/low-stock` | `stock_qty <= low_stock_threshold` |
| GET | `/shops/:shopId/products/:shopProductId` | |
| PATCH | `/shops/:shopId/products/:shopProductId` | body: `sellPrice, costPrice, lowStockThreshold` — **ห้ามแก้ stock** |
| DELETE | `/shops/:shopId/products/:shopProductId` | เลิกขายเฉพาะร้านนี้ (set `INACTIVE` ไม่ลบแถว) |

path ตรงตาม endpoint sheet แถว 62–67
(ตาราง naming ใน `AGENTS.md` ยกตัวอย่างเป็น `/shops/:shopId/shop-products` ซึ่งขัดกับ sheet
ที่ไฟล์เดียวกันระบุว่าเป็น API contract — ยึด sheet ไว้ก่อน รอทีมแก้ตัวอย่างใน AGENTS.md)

> โค้ดในโมดูลนี้ไม่มี comment ในไฟล์โดยตั้งใจ — **เหตุผลเบื้องหลังทุกอย่างอยู่ใน README นี้**
> ถ้าจะแก้อะไรที่ดูแปลก อ่านหัวข้อ "การตัดสินใจ" ด้านล่างก่อน

## การตรวจสิทธิ์ — สองชั้นตาม AGENTS.md

ทุกเมธอดรับ `userId` ของคนที่ยิง request แล้วให้ `SHOP_ACCESS_PROVIDER`
(`common/shop-access/shop-access.port.ts`) เป็นตัว resolve ว่า owner คือใครและผ่านไหม

| ระดับ | ใช้กับ | เช็คอะไร |
|---|---|---|
| `assertCanViewShopProducts` | GET ทุกตัว | ร้านเป็นของ owner จริง + ถ้าเป็นพนักงานต้องถูกมอบหมายเข้าร้านนี้ |
| `assertCanManageShopProducts` | POST / PATCH / DELETE | เหมือนด้านบน **+** `staff_permissions.can_manage_product` **+** แพ็กเกจต้องไม่หมดอายุ |

- ร้านที่ไม่ใช่ของตัวเองคืน **404** ไม่ใช่ 403 เพื่อไม่บอกใบ้ว่า `shopId` นี้มีอยู่จริง
- ร้านที่ Admin ระงับไว้ (`shops.status = SUSPENDED`) คืน 403 `SHOP_SUSPENDED`
- read-only บล็อกเฉพาะการเขียน — SRS บอกว่าหมดอายุแล้วยัง "ดูข้อมูลเดิมได้ตามปกติ"

## การตัดสินใจที่ต่างจาก ERD (ยืนยันกับ SRS + endpoint sheet แล้ว)

1. **`cost_price` อยู่ที่ `shop_products`** ไม่ใช่ `products` — ตาม SRS ("ข้อมูลระดับร้าน…ราคาขาย ต้นทุน…")
   แต่ละสาขารับของคนละยี่ปั๊ว ต้นทุนไม่เท่ากัน และ `sale_items.cost_price_snapshot` ของดิวต้องอ่านจากตรงนี้
   ⚠️ `prisma/design/schema.dbml` ยังเขียนว่าอยู่ที่ `products` — ต้องแก้ DBML ตาม
2. **DELETE = set `status = INACTIVE`** ไม่ลบแถว เพราะ `stock_movements` / `sale_items`
   อ้าง `shop_product_id` อยู่ ถ้าลบจริงประวัติจะขาด — และ `POST` ซ้ำจะเปิดขายแถวเดิมกลับมา ไม่สร้างแถวใหม่

## ที่ยังค้าง

- **FK `shop_products.shop_id` → `shops.id` ยังไม่มี** — `// TODO(shops)` ใน `schema.prisma`
  ต้องแยกเป็น PR ของตัวเองตามกฎ AGENTS.md แล้วให้แพรวเติม `ALTER TABLE` ใน migration
- `low-stock` ยังไม่มี pagination
- `Decimal` ถูก serialize เป็น string (เช่น `"20.00"`) ฝั่ง frontend ต้อง parse เอง

## smoke test

รันได้หลัง `pnpm start:dev` (ครอบทั้ง products และ shop-products)

```bash
node scripts/smoke-test.mjs
```

ต้องมี `users` / `shops` จริงใน DB ก่อน เพราะทุก endpoint เช็คสิทธิ์จาก DB แล้ว
ดูรายละเอียด env ที่ต้องตั้งในหัวไฟล์ `scripts/smoke-test.mjs`

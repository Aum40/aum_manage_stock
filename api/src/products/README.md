# products + shop-products (เซิ่น)

Branch: `feature/products-resource`
(ส่วน `shop-products` อยู่ใน branch `feature/shop-products-resource` ที่ stack ต่อจาก branch นี้)
แตกจาก `dev` — Prisma 7.9.1, validation ด้วย zod, Swagger ที่ `/docs`

## รันในเครื่องตัวเอง

```bash
cd api
pnpm install
cp .env.example .env            # ใส่ DATABASE_URL ของ postgres ตัวเอง

pnpm prisma db push             # sync schema เข้า DB ของตัวเอง
                                # (pnpm install รัน prisma generate ให้แล้วผ่าน postinstall)
psql "$DATABASE_URL" -f prisma/sql/001_products_partial_indexes.sql

pnpm start:dev                  # เปิด http://localhost:3000/docs
pnpm test
```

> ทีมใช้ `pnpm prisma db push` ระหว่าง dev — ไม่ต้องสร้าง migration เอง
> ทุกครั้งที่ `git pull origin dev` แล้ว `schema.prisma` เปลี่ยน ให้รัน `db push` ซ้ำ
> ไม่งั้น DB ของตัวเองจะไม่ตรงกับโค้ด

## ยิงเทสต์ระหว่างที่ auth ยังไม่เสร็จ

ทุก endpoint ใช้ `@OwnerId()` ของอั้ม (`common/decorators/owner-id.decorator.ts`)
ซึ่งอ่านจาก header `x-user-id` ชั่วคราวจนกว่า JWT guard จะพร้อม

```bash
curl -X POST http://localhost:3000/products \
  -H 'content-type: application/json' \
  -H 'x-user-id: 0199a0e0-0000-7000-8000-000000000001' \
  -d '{"name":"โค้ก 325ml","unit":"กระป๋อง","barcode":"8851959132012"}'
```

## Endpoints

| Method | Path | หมายเหตุ |
|---|---|---|
| POST | `/products` | เช็ค `max_active_products` ก่อนเสมอ |
| GET | `/products` | `?q=&categoryId=&page=&limit=` ไม่รวมสินค้าที่ลบแล้ว |
| GET | `/products/search?barcode=` | คืน **object เดียว** (404 ถ้าไม่เจอ) |
| GET | `/products/:id` | |
| PATCH | `/products/:id` | |
| DELETE | `/products/:id` | soft delete + ปิดขายในทุกร้าน |

## การตัดสินใจที่ต่างจากเอกสารเดิม (ตกลงกับทีมแล้ว)

1. **บาร์โค้ด unique ระดับ owner** ไม่ใช่ระดับร้าน — เพราะเป็น Product Catalog กลาง
   ถ้า unique ระดับร้าน คลังกลางจะมีบาร์โค้ดซ้ำได้ แล้วตอนดิวสแกนขายจะ resolve ไม่ได้ว่าเป็นตัวไหน
   บังคับด้วย **partial unique index** `WHERE deleted_at IS NULL` เพื่อให้ลบแล้วเพิ่มบาร์โค้ดเดิมกลับมาได้
2. **`cost_price` ไม่อยู่ที่ `products`** — ย้ายไปเป็นข้อมูลระดับร้านใน `shop_products` ตาม SRS
   (อยู่ใน branch `feature/shop-products-resource`)

## จุดที่ต้องแก้เมื่อ branch คนอื่นเข้า dev

แก้ที่ `src/common/common.module.ts` **ที่เดียว** — service/controller ไม่ต้องแตะ

| เมื่อ branch นี้เข้า dev | เปลี่ยน provider | จาก adapter ชั่วคราว |
|---|---|---|
| `feature/subscriptions-resource` (พี่ปาน) | `PRODUCT_QUOTA_PROVIDER` | `StaticProductQuotaAdapter` → อ่าน `subscription_plans.max_active_products` |

เพิ่มเติมตอน merge:

- ถ้าอั้มเปลี่ยน `model categories` → `model Category` ให้แก้ 2 บรรทัด (relation ใน `Product` + back-relation)
- เอา SQL ใน `prisma/sql/001_products_partial_indexes.sql` ไปต่อท้าย `migration.sql` ของ migration แรก

# products (เซิ่น)

Product Catalog กลางระดับเจ้าของร้าน — สินค้าชิ้นเดียวใช้ได้ทุกร้านของ owner คนนั้น
และนับ product quota เพียง 1 รายการ (ส่วนราคา/ต้นทุน/สต็อกรายร้านอยู่ที่ `../shop-products`)

สถานะ: **merged เข้า `dev` แล้ว** (PR #8) — ทีมใช้ Postman ไม่มี Swagger ในโปรเจกต์นี้

## รันในเครื่องตัวเอง

```bash
cd api
pnpm install                    # postinstall รัน prisma generate ให้อัตโนมัติ
cp .env.example .env            # ใส่ DATABASE_URL ของ postgres ตัวเอง

pnpm prisma db push             # sync schema เข้า DB ของตัวเอง
pnpm start:dev
pnpm test
```

> ทีมใช้ `pnpm prisma db push` ระหว่าง dev — ไม่ต้องสร้าง migration เอง
> ทุกครั้งที่ `git pull origin dev` แล้ว `schema.prisma` เปลี่ยน ให้รัน `db push` ซ้ำ
> ไม่งั้น DB ของตัวเองจะไม่ตรงกับโค้ด
>
> partial unique index ของโมดูลนี้อยู่ใน migration `20260820000000_...` แล้ว
> ถ้าใช้ `db push` (ซึ่งข้าม migration) ให้รัน `prisma/sql/001_products_partial_indexes.sql`
> เพิ่มเองหนึ่งครั้ง — ดูหัวไฟล์นั้นประกอบ

## ยิงเทสต์ (ต้องมี access token)

ตั้งแต่ `feature/auth-resource-api` ลง `dev` ทุก endpoint อยู่หลัง `AuthGuard` ที่เป็น
global guard แล้ว header `x-user-id` ใช้ไม่ได้อีกต่อไป ต้องแนบ JWT จาก `POST /auth/login`

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"owner@example.com","password":"..."}' | jq -r .accessToken)

curl -X POST http://localhost:8000/products \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"name":"โค้ก 325ml","unit":"กระป๋อง","barcode":"8851959132012"}'
```

### ทำไมโมดูลนี้ใช้ `@CurrentUser('sub')` ไม่ใช่ `@OwnerId()`

**อย่าเปลี่ยนกลับเป็น `@OwnerId()` เพื่อให้เหมือนโมดูลอื่น — มันเปิดช่องโหว่สิทธิ์**

`@OwnerId()` แปลงพนักงานเป็น `users.owner_id` ให้ตั้งแต่ชั้น decorator ซึ่งเหมาะกับโมดูล
ที่ต้องการแค่ "ข้อมูลก้อนนี้เป็นของใคร" แต่โมดูลนี้ต้องรู้ทั้งสองอย่าง — เป็นของใคร
**และใครเป็นคนยิง** เพราะต้องเอาคนยิงไปเทียบกับ `staff_permissions`

`AccountContextService.resolve()` เป็นคนแปลง `users.id` เป็น `{ userId, ownerId, isStaff }`
ถ้า controller ส่ง owner id เข้ามาแทน คนยิงกับเจ้าของจะกลายเป็นคนเดียวกัน `isStaff` จะเป็น
`false` เสมอ แล้วด่านตรวจทั้งหมดใน `assertCanManageCatalog()` กับ `PrismaShopAccessAdapter`
จะถูกข้ามเงียบๆ ผลคือพนักงานที่ไม่มีสิทธิ์ `canManageProduct` แก้สินค้าได้
และเข้าจัดการร้านที่ตัวเองไม่ได้ถูก assign ได้ด้วย

spec ที่ mock `AccountContextService` ทั้งก้อนจับเคสนี้ไม่ได้ ดู
`'พนักงานที่ไม่มีสิทธิ์ canManageProduct -> 403'` ใน `products.service.spec.ts`
ซึ่งปล่อยให้ `AccountContextService` ตัวจริงทำงานกับ prisma mock

## Endpoints

| Method | Path                        | หมายเหตุ                                             |
| ------ | --------------------------- | ---------------------------------------------------- |
| POST   | `/products`                 | เช็ค `max_active_products` ตามแพ็กเกจก่อนเสมอ        |
| GET    | `/products`                 | `?q=&categoryId=&page=&limit=` ไม่รวมสินค้าที่ลบแล้ว |
| GET    | `/products/search?barcode=` | คืน **object เดียว** (404 ถ้าไม่เจอ)                 |
| GET    | `/products/:id`             |                                                      |
| PATCH  | `/products/:id`             |                                                      |
| DELETE | `/products/:id`             | soft delete + ปิดขายในทุกร้าน                        |

> โค้ดในโมดูลนี้ไม่มี comment ในไฟล์โดยตั้งใจ — **เหตุผลเบื้องหลังทุกอย่างอยู่ใน README นี้**
> ถ้าจะแก้อะไรที่ดูแปลก อ่านหัวข้อ "การตัดสินใจ" ด้านล่างก่อน

## การตรวจสิทธิ์

| ชั้น           | ทำอะไร                                                                                   | ที่ไหน                                     |
| -------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------ |
| resolve ผู้ใช้ | `users.owner_id ?? users.id` + บล็อกบัญชีที่ถูกระงับ                                     | `common/access/account-context.service.ts` |
| สิทธิ์พนักงาน  | เขียนคลังกลางได้เมื่อมี `staff_permissions.can_manage_product` อย่างน้อย 1 ร้านของ owner | `assertCanManageCatalog()`                 |
| read-only      | แพ็กเกจหมดอายุ → เขียนไม่ได้ (อ่านได้ปกติ) ใช้ `isSubscriptionReadOnly()` ของพี่ปาน      | `assertNotReadOnly()`                      |
| โควตา          | อ่าน `subscription_plans.max_active_products` จริง ไม่มีแถว subscription = Free 100      | `common/quota/product-quota.port.ts`       |

## การตัดสินใจที่ต่างจาก ERD (ยืนยันกับ SRS + endpoint sheet แล้ว)

1. **บาร์โค้ด unique ระดับ owner** ไม่ใช่ระดับร้าน — เพราะเป็น Product Catalog กลาง
   ถ้า unique ระดับร้าน คลังกลางจะมีบาร์โค้ดซ้ำได้ แล้วตอนดิวสแกนขายจะ resolve ไม่ได้ว่าเป็นตัวไหน
   บังคับด้วย **partial unique index** `WHERE deleted_at IS NULL` เพื่อให้ลบแล้วเพิ่มบาร์โค้ดเดิมกลับมาได้
2. **`assertBarcodeIsFree()` ในโค้ดไม่ใช่ตัวกันจริง** — เป็นแค่ตัวทำให้ error อ่านรู้เรื่อง
   (คืน 409 พร้อมชื่อสินค้าที่ชนกัน) **ตัวกันจริงคือ partial unique index `uq_products_owner_barcode`**
   ห้ามลบ index ทิ้งเพราะคิดว่าโค้ดเช็คให้แล้ว — โค้ดเป็น count-then-create ไม่ atomic
3. **`cost_price` ไม่อยู่ที่ `products`** — เป็นข้อมูลระดับร้านใน `shop_products` ตาม SRS
   ("ข้อมูลระดับร้านต้องประกอบด้วยราคาขาย ต้นทุน จำนวน stock…") และตาม endpoint sheet
   ⚠️ `prisma/design/schema.dbml` ยังเขียนว่า `cost_price` อยู่ที่ `products` — ต้องแก้ DBML ตาม

## ที่ยังค้าง

- อั้มมีแผนเปลี่ยน `model categories` → `model Category` เมื่อถึงตอนนั้นต้องแก้ 2 บรรทัด
  (relation ใน `Product` + back-relation) และ `products.service.ts` ที่เรียก `prisma.categories`
- AGENTS.md อยากให้ read-only เป็น guard กลางตัวเดียว ตอนนี้ `shops.service.ts` มี
  `assertNotReadOnly()` เป็น private ของตัวเอง และเรามีของเราแยก — เสนอให้รวมภายหลัง
- `Decimal` ถูก serialize เป็น string (เช่น `"20.00"`) ฝั่ง frontend ต้อง parse เอง
- เช็คโควตาเป็น count-then-create ยังไม่ atomic — ยิงพร้อมกันถี่มากอาจเกินได้ 1-2 ชิ้น

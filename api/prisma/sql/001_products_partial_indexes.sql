-- =====================================================================
-- [เซิ่น] Partial unique index ที่ Prisma schema เขียนเองไม่ได้
-- Prisma ยังไม่รองรับ `@@unique(..., where: ...)` จึงต้องรัน SQL นี้เพิ่มเอง
--
-- ระหว่าง dev (ใช้ `prisma db push`):  รันไฟล์นี้ด้วยมือครั้งเดียวหลัง push
--     psql "$DATABASE_URL" -f prisma/sql/001_products_partial_indexes.sql
--
-- ตอนสร้าง migration จริง (ตอน merge รวม):
--     เอา 2 statement นี้ไปต่อท้ายไฟล์ prisma/migrations/<...>_init/migration.sql
-- =====================================================================

-- SRS: บาร์โค้ดห้ามซ้ำภายในคลังสินค้ากลางของเจ้าของร้านคนเดียวกัน
-- ต้องเป็น PARTIAL index มิฉะนั้นสินค้าที่ถูก soft delete ไปแล้ว
-- จะกันไม่ให้เพิ่มสินค้าบาร์โค้ดเดิมกลับเข้ามาได้ตลอดกาล
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_owner_barcode
  ON products (owner_id, barcode)
  WHERE deleted_at IS NULL AND barcode IS NOT NULL;

-- ช่วย query นับ active product quota (max_active_products) ให้เร็วขึ้น
CREATE INDEX IF NOT EXISTS ix_products_owner_active
  ON products (owner_id)
  WHERE deleted_at IS NULL;

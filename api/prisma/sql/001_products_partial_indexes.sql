-- =====================================================================
-- [เซิ่น] Partial unique index ที่ Prisma schema เขียนเองไม่ได้
-- Prisma ยังไม่รองรับ `@@unique(..., where: ...)` จึงต้องรัน SQL นี้เพิ่มเอง
--
-- สถานะ: 2 statement นี้ถูกรวมเข้า migration แล้วโดยแพรว (commit 351ccb4)
--     prisma/migrations/20260820000000_add_auth_subscription_shop_models/migration.sql
--     -> ใครรัน `prisma migrate deploy` จะได้ index ครบอยู่แล้ว ไม่ต้องทำอะไรเพิ่ม
--
-- แต่ทีมใช้ `prisma db push` ระหว่าง dev ซึ่ง **ข้าม** โฟลเดอร์ migrations ทั้งหมด
-- ใครที่ push แล้วยังต้องรันไฟล์นี้เองหนึ่งครั้ง (idempotent รันซ้ำได้ไม่พัง):
--     psql "$DATABASE_URL" -f prisma/sql/001_products_partial_indexes.sql
--
-- ถ้าแก้ไฟล์นี้ ต้องแก้ใน migration ให้ตรงกันด้วย — migrations เป็นพื้นที่ของแพรว
-- ให้แจ้งแทนการแก้เอง (AGENTS.md: ห้ามเพิ่ม/แก้ prisma/migrations ระหว่าง feature work)
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

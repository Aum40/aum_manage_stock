-- =====================================================================
-- [เซิ่น] ข้อมูลตั้งต้นสำหรับ scripts/smoke-test.mjs
--
--     psql "$DATABASE_URL" -f scripts/seed-smoke.sql
--
-- ตั้งแต่ products/shop-products เช็คสิทธิ์จาก DB จริง (shops.owner_id +
-- staff_permissions + subscription) smoke test จะยิงผ่านไม่ได้เลยถ้าไม่มี
-- users/shops จริงอยู่ก่อน ไฟล์นี้สร้างชุดที่เล็กที่สุดที่ทำให้เทสต์ผ่าน
--
-- รันซ้ำได้ (ON CONFLICT DO NOTHING) และใช้เฉพาะ DB สำหรับ dev เท่านั้น
-- =====================================================================

-- เจ้าของร้านที่ smoke test ใช้ยิง (ตรงกับค่า default ของ OWNER_ID)
INSERT INTO users (id, first_name, last_name, username, role, status, created_at, updated_at)
VALUES (
  '0199a0e0-0000-7000-8000-000000000001',
  'Smoke', 'Owner', 'smoke_owner', 'SHOP_OWNER', 'ACTIVE', now(), now()
)
ON CONFLICT (id) DO NOTHING;

-- เจ้าของร้านคนอื่น — ไว้พิสูจน์ว่าเข้าร้านข้ามเจ้าของไม่ได้
INSERT INTO users (id, first_name, last_name, username, role, status, created_at, updated_at)
VALUES (
  '0199a0e0-0000-7000-8000-000000000002',
  'Smoke', 'Stranger', 'smoke_stranger', 'SHOP_OWNER', 'ACTIVE', now(), now()
)
ON CONFLICT (id) DO NOTHING;

-- ร้านของ owner (ตรงกับค่า default ของ SHOP_ID)
INSERT INTO shops (id, owner_id, name, status, created_at, updated_at)
VALUES (
  '0199a0e0-0000-7000-8000-0000000000aa',
  '0199a0e0-0000-7000-8000-000000000001',
  'ร้านทดสอบ smoke', 'ACTIVE', now(), now()
)
ON CONFLICT (id) DO NOTHING;

-- ร้านของคนอื่น (ตรงกับค่า default ของ FOREIGN_SHOP_ID) — ต้องยิงแล้วได้ 404
INSERT INTO shops (id, owner_id, name, status, created_at, updated_at)
VALUES (
  '0199a0e0-0000-7000-8000-0000000000cc',
  '0199a0e0-0000-7000-8000-000000000002',
  'ร้านของคนอื่น', 'ACTIVE', now(), now()
)
ON CONFLICT (id) DO NOTHING;

-- ไม่ต้อง seed subscription — บัญชีที่ไม่มีแถว subscription ถือเป็น Free Plan
-- (โควตา 100 รายการ และไม่มีวันเข้าโหมด read-only) ซึ่งพอสำหรับ smoke test
--
-- อยากทดสอบ read-only ให้เพิ่มแถว subscription ที่หมดอายุแล้วเอง เช่น
--   INSERT INTO subscriptions (id, user_id, plan_id, status, started_at, expires_at, created_at, updated_at)
--   VALUES (gen_random_uuid(), '<owner>', '<plan ที่มีอยู่>', 'ACTIVE',
--           now() - interval '2 year', now() - interval '1 day', now(), now());
-- แล้วยิง POST /products ซ้ำ ต้องได้ 403 code = SUBSCRIPTION_READ_ONLY

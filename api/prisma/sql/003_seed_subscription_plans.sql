-- Seed แพ็กเกจ 3 ระดับตาม SRS §57-59 (ดูตารางใน AGENTS.md)
-- ตามที่ note ท้าย schema.prisma ระบุไว้ว่าต้อง seed เองภายหลัง
--
-- idempotent — รันซ้ำได้ไม่พัง และอัปเดตค่าให้ตรงกับ SRS เสมอ
-- db push ไม่รันไฟล์ในโฟลเดอร์นี้ให้ ต้องรันเองครั้งเดียวหลัง push:
--   pnpm prisma db execute --file prisma/sql/003_seed_subscription_plans.sql
--
-- duration_months NULL = ไม่มีวันหมดอายุ (Free Plan เท่านั้น)
INSERT INTO subscription_plans
  (id, code, name_th, price_thb, duration_months,
   included_shop_quota, included_staff_quota, max_active_products,
   is_free, is_active)
VALUES
  (gen_random_uuid(), 'FREE', 'ฟรี',      0.00, NULL, 1, 0,  100, true,  true),
  (gen_random_uuid(), 'PLUS', 'พลัส',  2499.00,   12, 3, 6, 3000, false, true),
  (gen_random_uuid(), 'PRO',  'โปร',   3499.00,   12, 5, 10, 5000, false, true)
ON CONFLICT (code) DO UPDATE SET
  name_th              = EXCLUDED.name_th,
  price_thb            = EXCLUDED.price_thb,
  duration_months      = EXCLUDED.duration_months,
  included_shop_quota  = EXCLUDED.included_shop_quota,
  included_staff_quota = EXCLUDED.included_staff_quota,
  max_active_products  = EXCLUDED.max_active_products,
  is_free              = EXCLUDED.is_free,
  is_active            = EXCLUDED.is_active;

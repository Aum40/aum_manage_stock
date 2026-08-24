-- Backfill: บัญชีที่มีอยู่ก่อนฟีเจอร์ยืนยันอีเมล ถือว่ายืนยันแล้ว
-- ไม่งั้นทุกคนที่สมัครไว้ก่อนหน้านี้จะ login ไม่ได้ทันทีที่ deploy
--
-- db push ไม่รันไฟล์ในโฟลเดอร์นี้ให้ ต้องรันเองครั้งเดียวหลัง push:
--   pnpm prisma db execute --file prisma/sql/002_backfill_email_verified.sql --schema prisma/schema.prisma
UPDATE users
SET email_verified_at = created_at
WHERE email IS NOT NULL
  AND email_verified_at IS NULL;

-- @manual
--
-- Backfill: บัญชีที่มีอยู่ก่อนฟีเจอร์ยืนยันอีเมล ถือว่ายืนยันแล้ว
-- ไม่งั้นทุกคนที่สมัครไว้ก่อนหน้านี้จะ login ไม่ได้ทันทีที่ deploy
--
-- ⚠️ ทำเครื่องหมาย @manual ไว้เพราะ SqlScriptsRunner ต้องไม่แตะไฟล์นี้เอง
--    คำสั่งข้างล่างตั้ง email_verified_at ให้ "ทุกคนที่มีอีเมลแต่ยังไม่ยืนยัน"
--    ถ้าเผลอไปรันบนฐานข้อมูลที่ใช้งานอยู่ บัญชีที่เพิ่งสมัครและยังไม่กดลิงก์
--    ยืนยันจะถูกตีตราว่ายืนยันแล้วไปด้วย = ระบบยืนยันอีเมลใช้ไม่ได้ทั้งระบบ
--
--    เป็น backfill ครั้งเดียวสำหรับฐานข้อมูลที่มีอยู่ก่อนฟีเจอร์นี้เท่านั้น
--    ถ้าจำเป็นต้องรันจริง รันเองด้วยมือ:
--      pnpm prisma db execute --file prisma/sql/002_backfill_email_verified.sql --schema prisma/schema.prisma
UPDATE users
SET email_verified_at = created_at
WHERE email IS NOT NULL
  AND email_verified_at IS NULL;

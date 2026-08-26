-- Active users must have unique email/username. Soft-deleted users keep their
-- original identifiers for history but must not block a new registration.
--
-- Email is compared case-insensitively: mail domains do not distinguish case,
-- and every read path in users.service.ts lowercases before querying, so a row
-- stored as Earthty@gmail.com is unreachable — the duplicate check silently
-- passes and the owner cannot sign in with their own email.
--
-- SqlScriptsRunner รันไฟล์นี้ให้เองตอน api เริ่มทำงาน (db push ข้าม prisma/sql/
-- ทั้งโฟลเดอร์ จึงต้องมีตัวรันแยก) ถ้าจะรันเองก็ได้ ไฟล์นี้รันซ้ำได้ไม่พัง:
--
--     pnpm prisma db execute --file prisma/sql/004_users_partial_unique_indexes.sql --schema prisma/schema.prisma
--
-- ⚠️ If CREATE UNIQUE INDEX below fails with "could not create unique index",
--    the table already holds case-variant duplicates from before this fix.
--    Find them with:
--
--     SELECT lower(email), count(*), array_agg(id)
--     FROM users WHERE deleted_at IS NULL AND email IS NOT NULL
--     GROUP BY lower(email) HAVING count(*) > 1;
--
--    Decide which row to keep, remove the others, then re-run this file.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;

-- Rows written before the fix may still hold mixed case.
UPDATE users SET email = lower(email) WHERE email <> lower(email);

DROP INDEX IF EXISTS uq_users_email_active;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_active
  ON users (lower(email))
  WHERE deleted_at IS NULL AND email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_active
  ON users (username)
  WHERE deleted_at IS NULL AND username IS NOT NULL;

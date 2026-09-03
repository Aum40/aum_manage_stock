import { splitSqlStatements } from '@/database/sql-scripts.runner';

describe('splitSqlStatements', () => {
  it('แยกทีละคำสั่งและตัดคอมเมนต์ทิ้ง', () => {
    const sql = `
      -- comment ที่มี ; อยู่ข้างใน ต้องไม่ถูกนับเป็นตัวจบคำสั่ง
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
      /* comment
         หลายบรรทัด; */
      UPDATE users SET email = lower(email) WHERE email <> lower(email);
    `;

    expect(splitSqlStatements(sql)).toEqual([
      'ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key',
      'UPDATE users SET email = lower(email) WHERE email <> lower(email)',
    ]);
  });

  it('ไม่ตัดที่ ; ซึ่งอยู่ในสตริง', () => {
    const statements = splitSqlStatements(
      "INSERT INTO t (name) VALUES ('a;b'), ('it''s; fine');",
    );

    expect(statements).toHaveLength(1);
    expect(statements[0]).toContain("'a;b'");
    expect(statements[0]).toContain("'it''s; fine'");
  });

  it('เก็บบล็อก $$…$$ ไว้ทั้งก้อน', () => {
    const sql = `
      DO $$
      BEGIN
        EXECUTE 'TRUNCATE TABLE users';
      END $$;
      SELECT 1;
    `;

    const statements = splitSqlStatements(sql);
    expect(statements).toHaveLength(2);
    expect(statements[0]).toContain('BEGIN');
    expect(statements[0]).toContain('END');
    expect(statements[1]).toBe('SELECT 1');
  });

  it('คำสั่งสุดท้ายที่ไม่มี ; ปิดท้ายก็ยังนับ', () => {
    expect(splitSqlStatements('SELECT 1')).toEqual(['SELECT 1']);
  });

  it('ไฟล์ที่มีแต่คอมเมนต์ไม่คืนคำสั่งอะไรเลย', () => {
    expect(splitSqlStatements('-- @manual\n-- nothing to run\n')).toEqual([]);
  });
});

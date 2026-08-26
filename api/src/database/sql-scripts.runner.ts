import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PrismaService } from '@/database/prisma.service';

/**
 * รันไฟล์ใน prisma/sql/ ให้อัตโนมัติตอนแอปเริ่มทำงาน
 *
 * ทีมใช้ `prisma db push` ซึ่ง **ข้ามโฟลเดอร์ prisma/sql/ ทั้งหมด** ที่ผ่านมา
 * จึงต้องอาศัยให้ทุกคนจำไปรันเองทีละไฟล์ ซึ่งลืมกันตลอด และอาการเวลาลืมก็เงียบ
 * มาก — เช่นไม่มี unique index บนอีเมล ระบบก็แค่ปล่อยให้สมัครซ้ำได้เฉยๆ
 * โดยไม่มี error ให้เห็น
 *
 * ทำแบบเดียวกับ SubscriptionPlanSeeder คือเกาะ OnApplicationBootstrap แต่เพิ่ม
 * ตารางบันทึกว่าไฟล์ไหนรันไปแล้ว เพราะไฟล์บางใบ **รันซ้ำไม่ได้** — เช่น
 * 002_backfill_email_verified.sql ที่ไล่ตั้ง email_verified_at ให้ทุกคนที่มี
 * อีเมล ถ้ารันทุกครั้งที่บูต บัญชีที่เพิ่งสมัครและยังไม่ยืนยันจะถูกตีตราว่า
 * ยืนยันแล้วไปด้วย = ระบบยืนยันอีเมลตายทั้งระบบ
 *
 * ไฟล์ที่ไม่อยากให้รันอัตโนมัติ ให้ใส่ `-- @manual` ไว้ในหัวไฟล์
 *
 * หมายเหตุ: ตาราง ledger ไม่ได้อยู่ใน schema.prisma ดังนั้น `db push` อาจลบทิ้ง
 * ได้ ถ้าโดนลบก็แค่รันไฟล์ทั้งหมดใหม่รอบเดียว — ทุกไฟล์ที่รันอัตโนมัติต้องเขียน
 * แบบรันซ้ำได้เสมอ (IF NOT EXISTS / ON CONFLICT) ledger มีไว้กันไฟล์ที่รันซ้ำ
 * ไม่ได้เป็นหลัก ซึ่งไฟล์พวกนั้นควรทำเครื่องหมาย @manual อยู่แล้ว
 */
const LEDGER_TABLE = '_sql_scripts';
const MANUAL_MARKER = '@manual';

@Injectable()
export class SqlScriptsRunner implements OnApplicationBootstrap {
  private readonly logger = new Logger(SqlScriptsRunner.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    try {
      await this.run();
    } catch (error) {
      // ห้ามทำให้แอปบูตไม่ขึ้น — คนที่ยังไม่ได้ db push จะเปิดแอปไม่ได้เลย
      this.logger.error(
        `รันสคริปต์ใน prisma/sql/ ไม่สำเร็จ: ${this.describe(error)}`,
      );
    }
  }

  private async run() {
    const directory = join(process.cwd(), 'prisma', 'sql');
    const files = (await readdir(directory))
      .filter((name) => name.endsWith('.sql'))
      // ชื่อไฟล์ขึ้นต้นด้วยเลขลำดับ (001_, 002_, …) เรียงตามชื่อคือเรียงตามลำดับ
      .sort();

    if (files.length === 0) {
      return;
    }

    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${LEDGER_TABLE} (
        filename   text PRIMARY KEY,
        checksum   text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const applied = await this.prisma.$queryRawUnsafe<
      { filename: string; checksum: string }[]
    >(`SELECT filename, checksum FROM ${LEDGER_TABLE}`);
    const appliedByName = new Map(applied.map((row) => [row.filename, row]));

    for (const filename of files) {
      const sql = await readFile(join(directory, filename), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const previous = appliedByName.get(filename);

      const manual = this.isManual(sql);

      if (previous) {
        // ไฟล์ @manual ไม่เตือนเรื่อง checksum เพราะยังไงก็ไม่ได้ตั้งใจรันให้อยู่แล้ว
        if (previous.checksum !== checksum && !manual) {
          // ไม่รันซ้ำให้เอง เพราะไม่รู้ว่าที่แก้ไปนั้นรันซ้ำได้หรือเปล่า
          this.logger.warn(
            `${filename} ถูกแก้หลังจากรันไปแล้ว — ตรวจสอบเองว่าต้องรันส่วนที่เพิ่มมาไหม`,
          );
        }
        continue;
      }

      if (manual) {
        this.logger.log(
          `ข้าม ${filename} (ทำเครื่องหมาย ${MANUAL_MARKER} ไว้)`,
        );
        continue;
      }

      await this.apply(filename, sql, checksum);
    }
  }

  private async apply(filename: string, sql: string, checksum: string) {
    const statements = splitSqlStatements(sql);
    if (statements.length === 0) {
      return;
    }

    try {
      // ทั้งไฟล์ต้องสำเร็จหรือไม่สำเร็จพร้อมกัน ไม่งั้นจะเหลือสถานะครึ่งๆ ที่
      // ledger ไม่ได้บันทึกไว้ แล้วรอบหน้าจะรันซ้ำตั้งแต่ต้น
      await this.prisma.$transaction(async (tx) => {
        for (const statement of statements) {
          await tx.$executeRawUnsafe(statement);
        }
        await tx.$executeRawUnsafe(
          `INSERT INTO ${LEDGER_TABLE} (filename, checksum) VALUES ($1, $2)`,
          filename,
          checksum,
        );
      });
      this.logger.log(
        `รัน ${filename} สำเร็จ (${statements.length} statement)`,
      );
    } catch (error) {
      /**
       * ปล่อยให้แอปทำงานต่อ แต่ต้องดังพอให้เห็น — เคสที่เจอบ่อยที่สุดคือ
       * CREATE UNIQUE INDEX ไม่ผ่านเพราะมีข้อมูลซ้ำอยู่ก่อนแล้ว ซึ่งต้องให้คน
       * ตัดสินใจว่าจะลบแถวไหน ไม่ใช่หน้าที่ของโค้ด
       */
      this.logger.error(
        `รัน ${filename} ไม่สำเร็จ: ${this.describe(error)} — ` +
          `ยังไม่ถูกบันทึกลง ${LEDGER_TABLE} จะลองใหม่ตอนบูตครั้งหน้า`,
      );
    }
  }

  private isManual(sql: string): boolean {
    return sql
      .split('\n')
      .slice(0, 20)
      .some(
        (line) => line.trim().startsWith('--') && line.includes(MANUAL_MARKER),
      );
  }

  private describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

/**
 * ตัดไฟล์เป็นทีละ statement เพราะ $executeRawUnsafe ส่งผ่าน prepared statement
 * ซึ่งรับได้ทีละคำสั่ง ถ้ายัดทั้งไฟล์ไปจะได้ error ว่าส่งหลายคำสั่งไม่ได้
 *
 * ต้องข้าม ';' ที่อยู่ในคอมเมนต์ ในสตริง และในบล็อก $$…$$ (เช่น DO block)
 * ไม่งั้นจะตัดกลางคำสั่ง — ไฟล์ 003 มีชื่อแพ็กเกจภาษาไทยอยู่ในเครื่องหมายคำพูด
 */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let index = 0;

  while (index < sql.length) {
    const rest = sql.slice(index);

    // คอมเมนต์บรรทัดเดียว -- … จนจบบรรทัด
    if (rest.startsWith('--')) {
      const newline = sql.indexOf('\n', index);
      index = newline === -1 ? sql.length : newline;
      continue;
    }

    // คอมเมนต์หลายบรรทัด /* … */
    if (rest.startsWith('/*')) {
      const end = sql.indexOf('*/', index + 2);
      index = end === -1 ? sql.length : end + 2;
      continue;
    }

    // สตริง '…' โดย '' ข้างในคือ quote ที่ escape แล้ว
    if (rest.startsWith("'")) {
      let cursor = index + 1;
      while (cursor < sql.length) {
        if (sql[cursor] === "'") {
          if (sql[cursor + 1] === "'") {
            cursor += 2;
            continue;
          }
          cursor += 1;
          break;
        }
        cursor += 1;
      }
      current += sql.slice(index, cursor);
      index = cursor;
      continue;
    }

    // dollar-quoted $tag$ … $tag$ (DO block, ฟังก์ชัน)
    const dollarTag = /^\$[A-Za-z_]*\$/.exec(rest);
    if (dollarTag) {
      const tag = dollarTag[0];
      const end = sql.indexOf(tag, index + tag.length);
      const cursor = end === -1 ? sql.length : end + tag.length;
      current += sql.slice(index, cursor);
      index = cursor;
      continue;
    }

    if (sql[index] === ';') {
      if (current.trim()) {
        statements.push(current.trim());
      }
      current = '';
      index += 1;
      continue;
    }

    current += sql[index];
    index += 1;
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements;
}

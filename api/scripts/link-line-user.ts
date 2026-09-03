/**
 * ผูก lineUserId เข้ากับบัญชีที่มีอยู่ โดยไม่ต้องผ่าน LINE Login
 *
 * ใช้ตอนทดสอบ/เดโม LINE chatbot ในเครื่อง เพราะการผูกบัญชีของจริงต้องมี
 * LINE Login channel (คนละ channel กับ Messaging API) ซึ่งอาจยังไม่ได้ตั้งค่า
 *
 *   pnpm exec ts-node --transpile-only scripts/link-line-user.ts <email|username> <lineUserId>
 *
 * หา lineUserId ได้จาก log ของเซิร์ฟเวอร์ตอนทักบอทครั้งแรก
 * (PrismaLineIdentityAdapter จะ warn พร้อม id ออกมาให้)
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/database/generated/prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const [identifier, lineUserId] = process.argv.slice(2);

  if (!identifier || !lineUserId) {
    console.error(
      'ใช้: pnpm exec ts-node --transpile-only scripts/link-line-user.ts <email|username> <lineUserId>',
    );
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      OR: [{ email: identifier }, { username: identifier }],
    },
    select: { id: true, email: true, username: true, role: true },
  });

  if (!user) {
    console.error(`ไม่พบบัญชี "${identifier}"`);
    process.exitCode = 1;
    return;
  }

  const taken = await prisma.user.findFirst({
    where: { lineUserId, NOT: { id: user.id } },
    select: { email: true, username: true },
  });

  if (taken) {
    // lineUserId เป็น unique — ถ้าไม่เช็คก่อนจะได้ P2002 ที่อ่านไม่รู้เรื่อง
    console.error(
      `lineUserId นี้ถูกผูกกับบัญชีอื่นแล้ว (${taken.email ?? taken.username}) ต้องถอดออกก่อน`,
    );
    process.exitCode = 1;
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { lineUserId } });

  const shops =
    user.role === 'SHOP_STAFF'
      ? await prisma.shopStaff.findMany({
          where: { userId: user.id, removedAt: null },
          select: { shop: { select: { name: true } } },
        })
      : await prisma.shop.findMany({
          where: { ownerId: user.id, deletedAt: null },
          select: { name: true },
        });

  const names = shops.map((s) => ('shop' in s ? s.shop.name : s.name));

  console.log(`ผูกแล้ว: ${user.email ?? user.username} (${user.role})`);
  console.log(
    names.length
      ? `ร้านที่เข้าถึงได้ (${names.length}): ${names.join(', ')}`
      : 'บัญชีนี้ยังไม่มีร้าน — บอทจะตอบว่ายังไม่มีร้านค้า',
  );

  if (names.length > 1) {
    console.log(
      `มีหลายร้าน → ต้องพิมพ์ชื่อร้านนำหน้า เช่น "${names[0]} เพิ่มโค้ก 10"`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

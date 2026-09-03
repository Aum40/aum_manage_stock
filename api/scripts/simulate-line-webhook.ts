/**
 * จำลอง LINE ส่ง webhook เข้ามา โดยไม่ต้องมี LINE Channel จริงและไม่ต้องใช้ ngrok
 *
 * เซ็นลายเซ็นด้วย LINE_CHANNEL_SECRET ตัวเดียวกับที่เซิร์ฟเวอร์ใช้ตรวจ
 * จึงผ่านด่าน verifySignature เหมือนของจริงทุกประการ
 *
 *   pnpm exec ts-node --transpile-only scripts/simulate-line-webhook.ts <lineUserId> "<ข้อความ>"
 *
 * ตัวอย่าง:
 *   ... scripts/simulate-line-webhook.ts U_test_1 "เพิ่มโค้ก10"
 *   ... scripts/simulate-line-webhook.ts U_test_1 "ยืนยัน"
 */
import { createHmac } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/database/generated/prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const [lineUserId, text] = process.argv.slice(2);

  if (!lineUserId || !text) {
    console.error(
      'ใช้: pnpm exec ts-node --transpile-only scripts/simulate-line-webhook.ts <lineUserId> "<ข้อความ>"',
    );
    process.exitCode = 1;
    return;
  }

  const secret = process.env.LINE_CHANNEL_SECRET;

  if (!secret) {
    console.error(
      'ยังไม่ได้ตั้ง LINE_CHANNEL_SECRET ใน .env — ใส่ค่าอะไรก็ได้สำหรับทดสอบในเครื่อง',
    );
    process.exitCode = 1;
    return;
  }

  const port = process.env.PORT ?? '3000';
  const body = JSON.stringify({
    destination: 'Usimulatedbot',
    events: [
      {
        type: 'message',
        replyToken: `sim-${Date.now()}`,
        source: { type: 'user', userId: lineUserId },
        message: { type: 'text', text },
      },
    ],
  });

  const signature = createHmac('sha256', secret)
    .update(Buffer.from(body, 'utf8'))
    .digest('base64');

  const res = await fetch(`http://localhost:${port}/webhooks/line`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-line-signature': signature,
    },
    body,
  });

  console.log(`ส่ง: "${text}"  (HTTP ${res.status})`);

  if (res.status !== 200 && res.status !== 201) {
    console.log(`ตอบกลับ: ${await res.text()}`);
    return;
  }

  // ข้อความที่บอทตอบถูกบันทึกไว้ใน chat_messages เพราะยังส่งเข้า LINE จริงไม่ได้
  const user = await prisma.user.findFirst({
    where: { lineUserId },
    select: { id: true },
  });

  if (!user) {
    console.log(
      'บอทตอบกลับ: (บัญชียังไม่ผูก — ดูข้อความเต็มใน log ของเซิร์ฟเวอร์)',
    );
    return;
  }

  const reply = await prisma.chatMessage.findFirst({
    where: { userId: user.id, role: 'ASSISTANT' },
    orderBy: { createdAt: 'desc' },
    select: { content: true },
  });

  console.log('\nบอทตอบกลับ:');
  console.log(reply?.content ?? '(ไม่มี — ดู log ของเซิร์ฟเวอร์)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

import { Logger } from '@nestjs/common';
import z from 'zod';

const envSchema = z.object({
  // มี default ไว้ให้คนที่ .env ยังไม่มีบรรทัด PORT ยัง boot ขึ้นได้
  PORT: z.coerce.number().int().min(1).max(65535).default(8000),
  FRONTEND_URL: z.url(),
  DATABASE_URL: z.url(),
  // feature/stock-movements-resource + chat-command (พี่ดิว)
  PENDING_ACTION_TTL_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(1_440)
    .default(15),
  // LINE Messaging API — คนละตัวกับ LINE_LOGIN_CHANNEL_SECRET ที่ใช้ทำ LINE Login
  LINE_CHANNEL_SECRET: z.string().min(1).optional(),
  // [อั้ม] ใช้ตอบกลับผู้ใช้ทาง LINE — ไม่มีค่า = ทำงานได้แต่ไม่ตอบกลับ (log warn)
  LINE_CHANNEL_ACCESS_TOKEN: z.string().min(1).optional(),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRES_IN: z.coerce.number().int().positive(),
  REFRESH_TOKEN_EXPIRES_IN: z.coerce.number().int().positive(),
  LINE_LOGIN_CHANNEL_ID: z.string().min(1),
  LINE_LOGIN_CHANNEL_SECRET: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  // ส่งเมลผ่าน HTTP API ของ Brevo ไม่ใช่ SMTP — Railway ปิด outbound SMTP
  // ทุกแพลนยกเว้น Pro (ดู MailService) ค่า SMTP_* เดิมไม่ถูกใช้แล้ว
  //
  // optional แบบเดียวกับ STRIPE_SECRET_KEY: ไม่ใส่ก็ boot ขึ้น แต่ MailService
  // จะโยน 503 ตอนถูกเรียกจริง คนที่ไม่ได้แตะเรื่องเมลจึงไม่ต้องหา key มาใส่
  BREVO_API_KEY: z.string().min(1).optional(),
  MAIL_FROM: z.string().min(1),
  // ชื่อผู้ส่งที่ผู้รับเห็น — ไม่ใส่จะดึงจากส่วนหน้าของ MAIL_FROM
  // ถ้าเขียนเป็นรูป `ชื่อ <a@b.com>` ไม่งั้นใช้ค่าตั้งต้น
  MAIL_FROM_NAME: z.string().min(1).optional(),
  TWO_FACTOR_ENCRYPTION_KEY: z.string().length(64),
  TWO_FACTOR_CHALLENGE_SECRET: z.string().min(32),
  RESET_TOKEN_EXPIRES_IN: z.coerce.number().int().positive(),
  EMAIL_VERIFICATION_TOKEN_EXPIRES_IN: z.coerce.number().int().positive(),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  // จำเป็นเฉพาะคนที่ทำ/ทดสอบ PaymentsModule — คนอื่นไม่ต้องไปหา key มาใส่
  // ถึงจะ boot ขึ้น PaymentsService จะ throw ตอนถูกเรียกถ้าไม่ได้ตั้งค่าไว้
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  // [อั้ม] feature/chatbot-resource — optional โดยตั้งใจ
  // ไม่มีค่าเหล่านี้ = LLM parser ปิดตัวเอง แล้วตกไปใช้ deterministic parser แทน
  // คนที่ไม่ได้ทำ chatbot จึงไม่ต้องหา key มาใส่ก็ boot ขึ้น
  OLLAMA_HOST: z.string().min(1).optional(),
  OLLAMA_API_KEY: z.string().min(1).optional(),
  OLLAMA_MODEL: z.string().min(1).optional(),
});

export function validate(config: Record<string, any>) {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const logger = new Logger('EnvValidation');
    logger.error('Env validation failed', z.prettifyError(parsed.error));
    throw new Error('Env validation failed');
  }
  return parsed.data;
}

export type EnvVariable = z.infer<typeof envSchema>;

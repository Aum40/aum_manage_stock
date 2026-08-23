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
  ACCESS_TOKEN_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRES_IN: z.coerce.number().int().positive(),
  REFRESH_TOKEN_EXPIRES_IN: z.coerce.number().int().positive(),
  LINE_LOGIN_CHANNEL_ID: z.string().min(1),
  LINE_LOGIN_CHANNEL_SECRET: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  MAIL_FROM: z.string().min(1),
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
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
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

import { Logger } from '@nestjs/common';
import z from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(8000),
  DATABASE_URL: z.url(),
  PENDING_ACTION_TTL_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(1_440)
    .default(15),
  LINE_CHANNEL_SECRET: z.string().min(1).optional(),
  // [อั้ม] feature/chatbot-resource — optional โดยตั้งใจ
  // ถ้าเป็น required คนที่ยังไม่มี key จะบูตแอปไม่ขึ้นทั้งทีม
  // ไม่มีค่าเหล่านี้ = LLM parser ปิดตัวเอง แล้วตกไปใช้ deterministic parser แทน
  OLLAMA_HOST: z.string().optional(),
  OLLAMA_API_KEY: z.string().optional(),
  OLLAMA_MODEL: z.string().optional(),
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

import { Logger } from '@nestjs/common';
import z from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().max(65535).min(0),
  DATABASE_URL: z.url(),
  // [อั้ม] feature/chatbot-resource — optional โดยตั้งใจ
  // ถ้าเป็น required คนที่ยังไม่มี key จะบูตแอปไม่ขึ้นทั้งทีม
  // ChatbotModule จะโยน error ตอนเรียกใช้เองถ้าค่าไม่ครบ
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

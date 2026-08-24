import { z } from 'zod';

export const SendChatMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'กรุณาพิมพ์ข้อความ')
    .max(1000, 'ข้อความยาวเกินไป'),
});

export type SendChatMessageDto = z.infer<typeof SendChatMessageSchema>;

export const ListChatMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListChatMessagesQueryDto = z.infer<
  typeof ListChatMessagesQuerySchema
>;

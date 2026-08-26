import { z } from 'zod';

const THAI_PHONE_REGEX = /^0[0-9]{8,9}$/;

export const createShopSchema = z.object({
  name: z.string().trim().min(1, 'Shop name is required').max(150),
  description: z.string().trim().max(2000).optional(),
  imageUrl: z.string().url('Invalid image URL').max(500).optional(),
  phone: z
    .string()
    .trim()
    .regex(
      THAI_PHONE_REGEX,
      'Phone number must start with 0 and be 9-10 digits',
    )
    .optional(),
  address: z.string().trim().max(2000).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export type CreateShopDto = z.infer<typeof createShopSchema>;

export const updateShopSchema = createShopSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateShopDto = z.infer<typeof updateShopSchema>;

import { z } from "zod";

/** ตรงกับ createShopSchema/updateShopSchema ฝั่ง api (api/src/shops/dto/shop.dto.ts) */
const THAI_PHONE_REGEX = /^0[0-9]{8,9}$/;

export const shopFormSchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อร้าน").max(150),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  imageUrl: z
    .string()
    .trim()
    .url("ลิงก์รูปภาพไม่ถูกต้อง")
    .max(500)
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(THAI_PHONE_REGEX, "เบอร์โทรต้องขึ้นต้นด้วย 0 และมี 9-10 หลัก")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(2000).optional().or(z.literal("")),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export type ShopFormValues = z.infer<typeof shopFormSchema>;

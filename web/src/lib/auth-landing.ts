/**
 * หน้าแรกหลังล็อกอินสำเร็จ — ที่เดียวสำหรับทุกช่องทาง
 *
 * ทางเข้ามีหลายเส้น (รหัสผ่าน, 2FA, LINE callback, Google callback) เดิมแต่ละเส้น
 * ตัดสินใจเอง แล้ว OAuth ก็พาไป "/" ซึ่งเป็นหน้า landing ของคนที่ยังไม่ล็อกอิน
 * ผู้ใช้ที่ล็อกอินผ่าน LINE จึงเจอหน้าขายของแทนแดชบอร์ด — ทุกเส้นต้องเรียกที่นี่
 *
 * แอดมินไม่มีร้าน — @OwnerId() ฝั่ง api ตอบ 403 ให้ทุก endpoint ของฝั่งร้านค้า
 * ถ้าพาไป /dashboard จะเห็นหน้าเปล่าที่ทุก query แดงหมด แล้วโดน (main)/layout.tsx
 * เด้งกลับมา /admin อยู่ดี ส่งไปให้ถูกที่ตั้งแต่แรกดีกว่า
 */
export const DASHBOARD_PATH = '/dashboard';
export const ADMIN_PATH = '/admin';

export function landingPathFor(role: string | undefined): string {
  return role === 'ADMIN' || role === 'SUPER_ADMIN' ? ADMIN_PATH : DASHBOARD_PATH;
}

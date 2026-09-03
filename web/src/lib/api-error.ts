/**
 * NestJS ตอบ error 2 shape ที่ไม่เหมือนกัน:
 *   - HttpException ทั่วไป (409/401/403) → message เป็น string
 *   - ValidationPipe (400)               → message เป็น string[]
 * ถ้าโยน message ลง state ตรงๆ array จะถูก render ต่อกันเป็นพรืดไม่มีตัวคั่น
 */

/** ข้อความจาก api เป็นอังกฤษทั้งหมด แปลตรงนี้ทีเดียวแทนที่จะกระจายในแต่ละฟอร์ม */
const MESSAGE_TH: Record<string, string> = {
  'Email or username already registered': 'อีเมลนี้ถูกใช้งานแล้ว',
  'Email already registered': 'อีเมลนี้ถูกใช้งานแล้ว',
  'Username already taken': 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว',
  'Invalid credentials': 'อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง',
  'Email not verified':
    'อีเมลนี้ยังไม่ได้ยืนยัน กรุณากดลิงก์ยืนยันในอีเมลก่อนเข้าสู่ระบบ',
  'Invalid or expired verification token':
    'ลิงก์ยืนยันอีเมลหมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่',
  '2FA is already enabled': 'บัญชีนี้เปิดการยืนยัน 2 ขั้นตอนไว้อยู่แล้ว',
  'Your account has been suspended': 'บัญชีของคุณถูกระงับการใช้งาน',
  'Invalid 2FA code': 'รหัสยืนยันไม่ถูกต้อง',
  'Invalid recovery code': 'รหัสกู้คืนไม่ถูกต้อง',
  'Invalid or expired challenge token':
    'หมดเวลายืนยันตัวตน กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
  'Invalid or expired reset token':
    'ลิงก์รีเซ็ตรหัสผ่านหมดอายุ กรุณาขอลิงก์ใหม่',
  'Current password is incorrect': 'รหัสผ่านปัจจุบันไม่ถูกต้อง',
  'Set a password before changing your email': 'กรุณากำหนดรหัสผ่านก่อนเปลี่ยนอีเมล',
  // [เซิ่น] ร้านที่เจ้าของกดพักไว้ — api ตอบ 403 code SHOP_PAUSED
  // ข้อความต่างกันตามโมดูลที่ปฏิเสธ (stock กับ sales) จึงต้อง map ทั้งสองอัน
  'This shop is paused by its owner. Resume it before adjusting stock.':
    'ร้านนี้ถูกพักอยู่ ต้องกดเปิดร้านก่อนถึงจะปรับสต็อกได้',
  'This shop is paused by its owner. Resume it before managing sales.':
    'ร้านนี้ถูกพักอยู่ ต้องกดเปิดร้านก่อนถึงจะขายได้',
};

type ApiErrorBody = { message?: string | string[] } | null | undefined;

export function resolveApiError(data: ApiErrorBody, fallback: string): string {
  const raw = data?.message;

  if (Array.isArray(raw)) {
    if (raw.length === 0) return fallback;
    return raw.map((item) => MESSAGE_TH[item] ?? item).join(', ');
  }

  if (typeof raw === 'string' && raw.length > 0) {
    return MESSAGE_TH[raw] ?? raw;
  }

  return fallback;
}

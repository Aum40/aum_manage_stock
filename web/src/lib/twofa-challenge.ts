import 'server-only';
import { cookies } from 'next/headers';

const CHALLENGE_COOKIE = 'twofa_challenge';

/** อายุสั้น ใช้แค่ช่วงกรอกรหัส 6 หลักหลังถูกเด้งกลับมาจาก LINE/Google */
const CHALLENGE_MAX_AGE_SECONDS = 600;

/**
 * เก็บ challengeToken ไว้ใน httpOnly cookie แทนที่จะส่งผ่าน query string
 *
 * ตอนล็อกอินด้วยรหัสผ่าน หน้าเว็บถือ challengeToken ไว้ใน state ได้เลยเพราะ
 * อยู่หน้าเดิม แต่ทาง LINE/Google เป็นการ redirect ข้ามหน้า ถ้าจะส่งต่อก็มีแค่
 * URL กับ cookie — และ challengeToken คือของที่แลกเป็น session ได้ จึงไม่ควร
 * ไปโผล่ใน address bar, ประวัติเบราว์เซอร์ หรือ log ของ server ที่ไหนทั้งนั้น
 */
export const twoFactorChallengeCookie = {
  name: CHALLENGE_COOKIE,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: CHALLENGE_MAX_AGE_SECONDS,
  },
};

export async function getTwoFactorChallenge() {
  const cookieStore = await cookies();
  return cookieStore.get(CHALLENGE_COOKIE)?.value;
}

export async function clearTwoFactorChallenge() {
  const cookieStore = await cookies();
  cookieStore.delete(CHALLENGE_COOKIE);
}

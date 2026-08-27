import 'server-only';
import { randomUUID, timingSafeEqual } from 'node:crypto';

export type OAuthProvider = 'line' | 'google';

/** state มีอายุสั้น เพราะใช้แค่ช่วงเด้งไปผู้ให้บริการแล้วกลับมาเท่านั้น */
const STATE_MAX_AGE_SECONDS = 600;

export function oauthStateCookieName(provider: OAuthProvider): string {
  return `oauth_state_${provider}`;
}

export function createOAuthState(): string {
  return randomUUID();
}

/**
 * sameSite ต้องเป็น 'lax' ห้ามเป็น 'strict' — callback เป็น top-level navigation
 * ที่มาจากโดเมนของ LINE/Google ถ้าใช้ 'strict' เบราว์เซอร์จะไม่ส่ง cookie กลับมา
 * แล้วจะตรวจ state ไม่ผ่านทุกครั้ง
 */
export function oauthStateCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: STATE_MAX_AGE_SECONDS,
  };
}

/** เทียบแบบ timing-safe กันการเดา state ทีละตัวอักษรจากเวลาที่ตอบกลับ */
export function isValidOAuthState(
  expected: string | undefined,
  received: string | null,
): boolean {
  if (!expected || !received) {
    return false;
  }

  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

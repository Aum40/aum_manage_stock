import 'server-only';
import { getAccessTokenCookie } from '@/lib/session-cookies';

const API_URL = process.env.API_URL;

export class ApiAuthError extends Error {}

/**
 * เรียก api จากฝั่ง server พร้อมแนบ access token จาก cookie
 *
 * ตั้งใจไม่ refresh token ให้ตรงนี้ เพราะ Server Component เขียน cookie ไม่ได้
 * (cookies() เป็น read-only นอก Route Handler / Server Action) ถ้าเจอ 401
 * จะโยน ApiAuthError ให้หน้าที่เรียกไป redirect ไป /login แทน
 * ส่วนการ refresh ทำที่ route handler ฝั่ง /api/* ซึ่งเซ็ต cookie ได้
 */
export async function apiGet<T>(path: string): Promise<T> {
  const token = await getAccessTokenCookie();
  if (!token) {
    throw new ApiAuthError('No access token');
  }

  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (res.status === 401 || res.status === 403) {
    throw new ApiAuthError(`Unauthorized: ${path}`);
  }
  if (!res.ok) {
    throw new Error(`API ${path} failed with ${res.status}`);
  }

  return (await res.json()) as T;
}

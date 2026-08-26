import 'server-only';
import { NextResponse } from 'next/server';
import { getAccessTokenCookie } from '@/lib/session-cookies';

const API_URL = process.env.API_URL;

/**
 * ส่งต่อ request ไป api พร้อมแนบ access token จาก httpOnly cookie
 * เบราว์เซอร์จึงไม่เคยเห็น token เลย — เรียกได้แค่ผ่าน route handler ของเราเท่านั้น
 */
export async function forwardAuthed(
  path: string,
  init: { method: string; body?: unknown },
) {
  const token = await getAccessTokenCookie();
  if (!token) {
    return NextResponse.json(
      { message: 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง' },
      { status: 401 },
    );
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body === undefined
        ? {}
        : { 'Content-Type': 'application/json' }),
    },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });

  // [อั้ม] 204 ห้ามมี body ถ้าปล่อยไปเข้า NextResponse.json() จะโยน
  // "Invalid response status code 204" แล้วกลายเป็น 500 ที่ผู้ใช้เห็น
  // เจอครั้งแรกกับ DELETE /staff/:id/assign/:shopId — endpoint อื่นที่คืน 204
  // (เช่น DELETE /categories/:id) ก็เจอเหมือนกันทุกตัว
  if (res.status === 204) return new Response(null, { status: 204 });

  const data = await res.json().catch(() => null);
  return NextResponse.json(data, { status: res.status });
}

export async function readJsonBody(request: Request): Promise<unknown> {
  return request.json().catch(() => ({}));
}

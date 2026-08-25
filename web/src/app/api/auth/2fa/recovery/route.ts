import { NextResponse } from 'next/server';
import { setSessionCookies } from '@/lib/session-cookies';

const API_URL = process.env.API_URL;

/**
 * ใช้รหัสกู้คืนแทนรหัส 6 หลัก ตอนเข้าถึงแอป Authenticator ไม่ได้ (SRS §110)
 * รหัสหนึ่งใบใช้ได้ครั้งเดียว ฝั่ง api เป็นคนตัดทิ้งให้เอง
 */
export async function POST(request: Request) {
  const body = await request.json();

  const res = await fetch(`${API_URL}/auth/2fa/recovery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    return NextResponse.json(
      data ?? { message: 'รหัสกู้คืนไม่ถูกต้อง' },
      { status: res.status },
    );
  }

  await setSessionCookies(data.accessToken, data.refreshToken);
  return NextResponse.json({ ok: true });
}

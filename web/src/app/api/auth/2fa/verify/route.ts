import { NextResponse } from 'next/server';
import { setSessionCookies } from '@/lib/session-cookies';

const API_URL = process.env.API_URL;

export async function POST(request: Request) {
  const body = await request.json();

  const res = await fetch(`${API_URL}/auth/2fa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    return NextResponse.json(
      data ?? { message: 'รหัสไม่ถูกต้อง' },
      { status: res.status },
    );
  }

  await setSessionCookies(data.accessToken, data.refreshToken);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { clearSessionCookies, getRefreshTokenCookie } from '@/lib/session-cookies';

const API_URL = process.env.API_URL;

export async function POST() {
  const refreshToken = await getRefreshTokenCookie();

  if (refreshToken) {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {
      // logout ต้องเคลียร์ cookie ฝั่งเราเสมอ แม้เรียก backend ไม่สำเร็จ
    });
  }

  await clearSessionCookies();
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import {
  createOAuthState,
  oauthStateCookieName,
  oauthStateCookieOptions,
} from '@/lib/oauth-state';

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const state = createOAuthState();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '',
    // ต้องตรงกับที่ api ใช้ตอนแลก token (ประกอบจาก FRONTEND_URL) เป๊ะๆ
    redirect_uri: `${origin}/api/auth/google/callback`,
    state,
    scope: 'openid email profile',
    // ไม่ใส่ Google จะข้ามหน้าเลือกบัญชีถ้าเบราว์เซอร์ล็อกอินค้างอยู่บัญชีเดียว
    prompt: 'select_account',
  });

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
  response.cookies.set(
    oauthStateCookieName('google'),
    state,
    oauthStateCookieOptions(),
  );
  return response;
}

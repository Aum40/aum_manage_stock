import { NextResponse } from 'next/server';
import {
  createOAuthState,
  oauthStateCookieName,
  oauthStateCookieOptions,
} from '@/lib/oauth-state';
import { resolvePublicOrigin } from '@/lib/public-origin';

/**
 * เริ่ม LINE Login ฝั่ง server เพื่อให้เก็บ state ลง httpOnly cookie ได้
 * (ถ้าให้ปุ่มฝั่ง client เด้งไปเอง จะเก็บ state แบบที่ JS อ่านไม่ได้ไม่ได้เลย)
 */
export async function GET(request: Request) {
  const origin = resolvePublicOrigin(request);
  const state = createOAuthState();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID ?? '',
    // ต้องตรงกับที่ api ใช้ตอนแลก token (ประกอบจาก FRONTEND_URL) เป๊ะๆ
    redirect_uri: `${origin}/api/auth/line/callback`,
    state,
    scope: 'profile openid',
  });

  const response = NextResponse.redirect(
    `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`,
  );
  response.cookies.set(
    oauthStateCookieName('line'),
    state,
    oauthStateCookieOptions(),
  );
  return response;
}

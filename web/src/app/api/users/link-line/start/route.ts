import { NextResponse } from 'next/server';
import { createOAuthState, oauthStateCookieOptions } from '@/lib/oauth-state';
import { linkStateCookieName } from '@/lib/oauth-link-state';

/**
 * ผูกบัญชีใช้ callback "ตัวเดียวกับตอน login" โดยตั้งใจ
 *
 * redirect_uri ทุกตัวต้องถูกลงทะเบียนไว้ใน console ของผู้ให้บริการก่อน ถ้าเปิด
 * callback เส้นใหม่สำหรับการผูกบัญชีโดยเฉพาะ ทุกคนในทีมจะกดปุ่มเชื่อมไม่ได้จนกว่า
 * จะมีคนไปเพิ่ม URL นั้นใน console (LINE ตอบ 400 ทันที) — จึงยืมเส้นเดิมมาใช้
 * แล้วแยกว่าเป็น "ผูกบัญชี" หรือ "เข้าสู่ระบบ" ด้วย cookie ของ state แทน
 */
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const state = createOAuthState();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID ?? '',
    redirect_uri: `${origin}/api/auth/line/callback`,
    state,
    scope: 'profile openid',
  });

  const response = NextResponse.redirect(
    `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`,
  );
  response.cookies.set(
    linkStateCookieName('line'),
    state,
    oauthStateCookieOptions(),
  );
  return response;
}

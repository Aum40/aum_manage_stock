import { NextResponse } from 'next/server';
import { createOAuthState, oauthStateCookieOptions } from '@/lib/oauth-state';
import { linkStateCookieName } from '@/lib/oauth-link-state';
import { resolvePublicOrigin } from '@/lib/public-origin';

/**
 * ผูกบัญชีใช้ callback "ตัวเดียวกับตอน login" โดยตั้งใจ
 *
 * redirect_uri ทุกตัวต้องถูกลงทะเบียนไว้ใน console ของผู้ให้บริการก่อน ถ้าเปิด
 * callback เส้นใหม่สำหรับการผูกบัญชีโดยเฉพาะ ทุกคนในทีมจะกดปุ่มเชื่อมไม่ได้จนกว่า
 * จะมีคนไปเพิ่ม URL นั้นใน console (LINE ตอบ 400 ทันที) — จึงยืมเส้นเดิมมาใช้
 * แล้วแยกว่าเป็น "ผูกบัญชี" หรือ "เข้าสู่ระบบ" ด้วย cookie ของ state แทน
 */
export async function GET(request: Request) {
  const origin = resolvePublicOrigin(request);
  const state = createOAuthState();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '',
    redirect_uri: `${origin}/api/auth/google/callback`,
    state,
    scope: 'openid email profile',
    prompt: 'select_account',
  });

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
  response.cookies.set(
    linkStateCookieName('google'),
    state,
    oauthStateCookieOptions(),
  );
  return response;
}

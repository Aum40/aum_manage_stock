import { NextRequest, NextResponse } from 'next/server';
import { setSessionCookies } from '@/lib/session-cookies';
import { isValidOAuthState, oauthStateCookieName } from '@/lib/oauth-state';
import { linkStateCookieName } from '@/lib/oauth-link-state';
import { forwardAuthed } from '@/lib/api-forward';
import { landingPathFor } from '@/lib/auth-landing';
import { twoFactorChallengeCookie } from '@/lib/twofa-challenge';
import { resolvePublicOrigin } from '@/lib/public-origin';

const API_URL = process.env.API_URL;
const STATE_COOKIE = oauthStateCookieName('google');
const LINK_STATE_COOKIE = linkStateCookieName('google');

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = resolvePublicOrigin(request);
  const code = searchParams.get('code');
  const receivedState = searchParams.get('state');

  /**
   * callback เส้นนี้รับสองงาน: เข้าสู่ระบบ กับผูกบัญชีเข้ากับบัญชีที่ล็อกอินอยู่
   * แยกด้วย cookie ของ state ว่าใบไหนตรงกับที่ผู้ให้บริการส่งกลับมา
   * (ใช้ callback ร่วมกันเพราะ redirect_uri ต้องลงทะเบียนใน console ก่อนใช้งาน
   * ดู app/api/users/link-google/start/route.ts)
   */
  const isLinkFlow = isValidOAuthState(
    request.cookies.get(LINK_STATE_COOKIE)?.value,
    receivedState,
  );

  // state ใช้ได้ครั้งเดียว ล้างทิ้งทุกเส้นทางออกไม่ว่าจะสำเร็จหรือไม่
  const done = (path: string) => {
    const response = NextResponse.redirect(`${origin}${path}`);
    response.cookies.delete(STATE_COOKIE);
    response.cookies.delete(LINK_STATE_COOKIE);
    return response;
  };

  if (isLinkFlow) {
    if (!code) {
      return done('/profile?connection=google&status=missing_code');
    }

    const result = await forwardAuthed('/users/me/link-google', {
      method: 'POST',
      body: { code },
    });
    const linked = result.status >= 200 && result.status < 300;
    return done(
      `/profile?connection=google&status=${linked ? 'linked' : 'failed'}`,
    );
  }

  if (!isValidOAuthState(request.cookies.get(STATE_COOKIE)?.value, receivedState)) {
    return done('/login?error=invalid_state');
  }

  if (!code) {
    return done('/login?error=missing_code');
  }

  const res = await fetch(
    `${API_URL}/auth/google/callback?code=${encodeURIComponent(code)}`,
  );
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    return done('/login?error=google_login_failed');
  }

  /**
   * SRS §111 — 2FA บังคับใช้กับทุกช่องทางล็อกอิน รวม LINE/Google api จึงตอบ
   * challengeToken แทน token ชุดจริงเมื่อบัญชีเปิด 2FA ไว้ ต้องพากลับไปกรอก
   * รหัส 6 หลักที่หน้า login ก่อน ไม่ใช่ตีเป็นล็อกอินไม่สำเร็จ
   */
  if (data?.requires2fa && data.challengeToken) {
    const response = done('/login?twofa=1');
    response.cookies.set(
      twoFactorChallengeCookie.name,
      data.challengeToken,
      twoFactorChallengeCookie.options,
    );
    return response;
  }

  if (!data?.accessToken) {
    return done('/login?error=google_login_failed');
  }

  await setSessionCookies(data.accessToken, data.refreshToken);
  // เดิมพาไป '/' ซึ่งเป็นหน้า landing ของคนที่ยังไม่ล็อกอิน — คนที่เพิ่งล็อกอิน
  // สำเร็จต้องเข้าแดชบอร์ดเหมือนช่องทางรหัสผ่าน (lib/auth-landing.ts)
  return done(landingPathFor((data as { user?: { role?: string } }).user?.role));
}

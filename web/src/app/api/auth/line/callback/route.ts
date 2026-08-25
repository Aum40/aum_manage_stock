import { NextRequest, NextResponse } from 'next/server';
import { setSessionCookies } from '@/lib/session-cookies';
import { isValidOAuthState, oauthStateCookieName } from '@/lib/oauth-state';

const API_URL = process.env.API_URL;
const STATE_COOKIE = oauthStateCookieName('line');

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // state ใช้ได้ครั้งเดียว ล้างทิ้งทุกเส้นทางออกไม่ว่าจะสำเร็จหรือไม่
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  const fail = (error: string) => {
    const response = NextResponse.redirect(`${origin}/login?error=${error}`);
    response.cookies.delete(STATE_COOKIE);
    return response;
  };

  if (!isValidOAuthState(expectedState, searchParams.get('state'))) {
    return fail('invalid_state');
  }

  if (!code) {
    return fail('missing_code');
  }

  const res = await fetch(
    `${API_URL}/auth/line/callback?code=${encodeURIComponent(code)}`,
  );
  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.accessToken) {
    return fail('line_login_failed');
  }

  await setSessionCookies(data.accessToken, data.refreshToken);
  const response = NextResponse.redirect(`${origin}/`);
  response.cookies.delete(STATE_COOKIE);
  return response;
}

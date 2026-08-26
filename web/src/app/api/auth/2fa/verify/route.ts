import { NextResponse } from 'next/server';
import { setSessionCookies } from '@/lib/session-cookies';
import {
  clearTwoFactorChallenge,
  getTwoFactorChallenge,
} from '@/lib/twofa-challenge';

const API_URL = process.env.API_URL;

/**
 * challengeToken มาได้สองทาง: ฟอร์มส่งมาในบอดี้ (ล็อกอินด้วยรหัสผ่าน — หน้าเว็บ
 * ถือไว้ใน state ได้เพราะอยู่หน้าเดิม) หรืออยู่ใน cookie (ล็อกอินผ่าน LINE/Google
 * ที่ redirect ข้ามหน้ามา จึงฝากไว้ใน cookie แทนการส่งผ่าน URL)
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    challengeToken?: string;
    otpCode?: string;
  };

  const challengeToken = body.challengeToken ?? (await getTwoFactorChallenge());
  if (!challengeToken) {
    return NextResponse.json(
      { message: 'หมดเวลายืนยันตัวตน กรุณาเข้าสู่ระบบใหม่อีกครั้ง' },
      { status: 401 },
    );
  }

  const res = await fetch(`${API_URL}/auth/2fa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeToken, otpCode: body.otpCode }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    return NextResponse.json(
      data ?? { message: 'รหัสไม่ถูกต้อง' },
      { status: res.status },
    );
  }

  await setSessionCookies(data.accessToken, data.refreshToken);
  await clearTwoFactorChallenge();
  return NextResponse.json({ ok: true });
}

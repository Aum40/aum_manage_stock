import { NextResponse } from 'next/server';

import { refreshAccessToken } from '@/lib/api-forward';

/**
 * ต่ออายุ session จาก refresh token ที่เก็บไว้ใน httpOnly cookie
 *
 * ใช้ refreshAccessToken() ตัวเดียวกับที่ forwardAuthed() ใช้ตอนเจอ 401 โดยตั้งใจ
 * ห้ามยิง /auth/refresh เองตรงนี้ — api หมุน refresh token ใหม่ทุกครั้งและถือว่า
 * ใบที่ถูกใช้แล้วคือโดนขโมย แล้วเพิกถอนทั้ง family ถ้าตัวจับเวลา (SessionRefresher)
 * กับ request ที่เจอ 401 บังเอิญต่ออายุพร้อมกัน ตัวที่สองจะส่งใบที่ใช้ไปแล้ว
 * แล้วผู้ใช้จะถูกเตะออกทันที — helper ตัวนั้น dedupe ตามค่า token ให้อยู่แล้ว
 */
export async function POST() {
  const accessToken = await refreshAccessToken();

  if (!accessToken) {
    return NextResponse.json(
      { message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' },
      { status: 401 },
    );
  }

  return NextResponse.json({ ok: true });
}

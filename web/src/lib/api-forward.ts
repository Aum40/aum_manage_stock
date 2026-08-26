import 'server-only';
import { NextResponse } from 'next/server';
import {
  clearSessionCookies,
  getAccessTokenCookie,
  getRefreshTokenCookie,
  setSessionCookies,
} from '@/lib/session-cookies';

const API_URL = process.env.API_URL;

/**
 * ต่ออายุ access token ที่ค้างอยู่ พร้อมกันไม่ให้ยิง /auth/refresh ซ้อนกัน
 *
 * api หมุน refresh token ใหม่ทุกครั้งที่ต่ออายุ และถ้าใบเดิมถูกใช้ซ้ำจะถือว่า
 * โดนขโมยแล้วเพิกถอนทั้ง family ทิ้ง (auth.service.ts) — หน้าเว็บหนึ่งหน้ายิง
 * query ขนานกันหลายก้อน ถ้าปล่อยให้ทุกก้อนที่เจอ 401 วิ่งไป refresh พร้อมกัน
 * ก้อนที่สองจะส่งใบที่ถูกใช้ไปแล้ว แล้วผู้ใช้จะถูกเตะออกทันทีที่ token หมดอายุ
 * ครั้งแรก จึงต้อง dedupe ตามค่า refresh token ให้เหลือคำขอจริงใบละครั้ง
 */
const inFlightRefresh = new Map<string, Promise<string | null>>();

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshTokenCookie();
  if (!refreshToken) {
    return null;
  }

  const pending = inFlightRefresh.get(refreshToken);
  if (pending) {
    return pending;
  }

  const request = (async () => {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => null);

    if (!res?.ok) {
      // refresh ใช้ไม่ได้แล้ว (หมดอายุ ถูกเพิกถอน หรือบัญชีถูกระงับ)
      // ล้าง cookie ทิ้งเลย ไม่งั้นทุก request ถัดไปจะวนมาลองใหม่ไม่จบ
      await clearSessionCookies();
      return null;
    }

    const data = (await res.json().catch(() => null)) as {
      accessToken?: string;
      refreshToken?: string;
    } | null;

    if (!data?.accessToken || !data.refreshToken) {
      await clearSessionCookies();
      return null;
    }

    // ต้องเขียนทับทั้งคู่เสมอ — ใบเก่าถูก mark ว่าใช้แล้ว ถ้าเผลอส่งซ้ำรอบหน้า
    // api จะตีเป็นการขโมย token แล้วเพิกถอนทั้ง family
    await setSessionCookies(data.accessToken, data.refreshToken);
    return data.accessToken;
  })().finally(() => {
    inFlightRefresh.delete(refreshToken);
  });

  inFlightRefresh.set(refreshToken, request);
  return request;
}

function callApi(
  path: string,
  init: { method: string; body?: unknown },
  token: string,
) {
  return fetch(`${API_URL}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body === undefined
        ? {}
        : { 'Content-Type': 'application/json' }),
    },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });
}

function unauthorized() {
  return NextResponse.json(
    { message: 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง' },
    { status: 401 },
  );
}

/**
 * ส่งต่อ request ไป api พร้อมแนบ access token จาก httpOnly cookie
 * เบราว์เซอร์จึงไม่เคยเห็น token เลย — เรียกได้แค่ผ่าน route handler ของเราเท่านั้น
 *
 * access token อายุ 900 วินาที ถ้าเจอ 401 จะต่ออายุด้วย refresh token แล้วยิงซ้ำ
 * ให้หนึ่งครั้ง ที่ทำตรงนี้ได้เพราะ route handler เขียน cookie ได้ ต่างจาก
 * Server Component (ดู lib/api-server.ts)
 */
export async function forwardAuthed(
  path: string,
  init: { method: string; body?: unknown },
) {
  let token: string | null | undefined = await getAccessTokenCookie();

  // ไม่มี access token แล้ว แต่ refresh ยังอยู่ได้อีก 30 วัน
  if (!token) {
    token = await refreshAccessToken();
  }
  if (!token) {
    return unauthorized();
  }

  let res = await callApi(path, init, token);

  // 401 เท่านั้น — 403 คือ "ล็อกอินแล้วแต่ไม่มีสิทธิ์" (เช่นบัญชีถูกระงับ)
  // ต่ออายุ token กี่รอบก็ยังไม่มีสิทธิ์อยู่ดี
  if (res.status === 401) {
    const renewed = await refreshAccessToken();
    if (!renewed) {
      return unauthorized();
    }
    res = await callApi(path, init, renewed);
  }

  // [อั้ม] 204 ห้ามมี body ถ้าปล่อยไปเข้า NextResponse.json() จะโยน
  // "Invalid response status code 204" แล้วกลายเป็น 500 ที่ผู้ใช้เห็น
  // เจอครั้งแรกกับ DELETE /staff/:id/assign/:shopId — endpoint อื่นที่คืน 204
  // (เช่น DELETE /categories/:id) ก็เจอเหมือนกันทุกตัว
  if (res.status === 204) return new Response(null, { status: 204 });

  const data = await res.json().catch(() => null);
  return NextResponse.json(data, { status: res.status });
}

export async function readJsonBody(request: Request): Promise<unknown> {
  return request.json().catch(() => ({}));
}

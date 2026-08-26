import { resolveApiError } from '@/lib/api-error';

/**
 * ตัวเรียก api สำหรับฝั่ง client — ยิงไปที่ route handler ของเว็บ (/api/*) เท่านั้น
 * ไม่ยิงตรงไป NestJS เพราะ access token อยู่ใน httpOnly cookie ที่ JS อ่านไม่ได้
 * (route handler เป็นคนแนบ Bearer ให้ ดู lib/api-forward.ts)
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const DEFAULT_ERROR = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';

async function request<T>(
  path: string,
  init: { method: string; body?: unknown } = { method: 'GET' },
): Promise<T> {
  const res = await fetch(path, {
    method: init.method,
    headers:
      init.body === undefined ? {} : { 'Content-Type': 'application/json' },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(resolveApiError(data, DEFAULT_ERROR), res.status);
  }

  return data as T;
}

/** ต่อ query string โดยตัด key ที่ยังไม่ได้เลือกทิ้ง จะได้ไม่ส่ง ?role= เปล่าๆ ไป */
export function withQuery(
  path: string,
  params: Record<string, string | number | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

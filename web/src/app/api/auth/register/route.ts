import { NextResponse } from 'next/server';

const API_URL = process.env.API_URL;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  if (!API_URL) {
    return NextResponse.json(
      { message: 'API_URL is not configured' },
      { status: 503 },
    );
  }

  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { message: 'ไม่สามารถเชื่อมต่อระบบได้ กรุณาเปิด API แล้วลองใหม่อีกครั้ง' },
      { status: 503 },
    );
  }
}

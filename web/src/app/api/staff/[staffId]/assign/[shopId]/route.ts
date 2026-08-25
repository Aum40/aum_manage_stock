import 'server-only';
import { getAccessTokenCookie } from '@/lib/session-cookies';

const API_URL = process.env.API_URL;

/**
 * ตั้งใจไม่ใช้ forwardAuthed() ตรงนี้
 *
 * api ตอบ 204 No Content ให้ endpoint นี้ แต่ forwardAuthed ปิดท้ายด้วย
 * NextResponse.json(data, { status }) เสมอ ซึ่งพัง เพราะ 204 ห้ามมี body
 * ("Invalid response status code 204") — เป็นบั๊กของ helper กลาง ไม่ใช่ของ
 * endpoint นี้ ทุก endpoint ที่คืน 204 จะเจอเหมือนกัน (เช่น DELETE /categories/:id)
 * แจ้งทีมไว้แล้ว ระหว่างรอแก้ที่ helper จึงยิงเองตรงนี้ก่อน
 */
export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ staffId: string; shopId: string }> },
) {
  const token = await getAccessTokenCookie();
  if (!token) {
    return Response.json(
      { message: 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง' },
      { status: 401 },
    );
  }

  const { staffId, shopId } = await ctx.params;
  const res = await fetch(`${API_URL}/staff/${staffId}/assign/${shopId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 204) return new Response(null, { status: 204 });

  const data = await res.json().catch(() => null);
  return Response.json(data, { status: res.status });
}

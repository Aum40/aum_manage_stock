import { forwardAuthed, readJsonBody } from '@/lib/api-forward';

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ shopId: string; staffId: string }> },
) {
  const { shopId, staffId } = await ctx.params;

  return forwardAuthed(`/shops/${shopId}/staff/${staffId}/permissions`, {
    method: 'GET',
  });
}

/**
 * PUT เขียนทับสิทธิ์ทั้งชุด ไม่ใช่ patch ทีละอัน — หน้าเว็บจึงต้องส่งค่าครบ
 * ทุกฟิลด์ทุกครั้ง ไม่งั้น api จะตีกลับด้วย 400 จาก zod
 */
export async function PUT(
  request: Request,
  ctx: { params: Promise<{ shopId: string; staffId: string }> },
) {
  const { shopId, staffId } = await ctx.params;

  return forwardAuthed(`/shops/${shopId}/staff/${staffId}/permissions`, {
    method: 'PUT',
    body: await readJsonBody(request),
  });
}

import { forwardAuthed } from '@/lib/api-forward';

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ staffId: string }> },
) {
  const { staffId } = await ctx.params;

  return forwardAuthed(`/staff/${staffId}/shops`, { method: 'GET' });
}

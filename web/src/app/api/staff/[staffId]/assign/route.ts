import { forwardAuthed, readJsonBody } from '@/lib/api-forward';

export async function POST(
  request: Request,
  ctx: { params: Promise<{ staffId: string }> },
) {
  const { staffId } = await ctx.params;

  return forwardAuthed(`/staff/${staffId}/assign`, {
    method: 'POST',
    body: await readJsonBody(request),
  });
}

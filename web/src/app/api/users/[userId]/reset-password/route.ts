import { forwardAuthed, readJsonBody } from '@/lib/api-forward';

export async function POST(
  request: Request,
  ctx: { params: Promise<{ userId: string }> },
) {
  const { userId } = await ctx.params;

  return forwardAuthed(`/users/${userId}/reset-password`, {
    method: 'POST',
    body: await readJsonBody(request),
  });
}

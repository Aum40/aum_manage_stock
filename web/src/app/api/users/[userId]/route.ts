import { forwardAuthed, readJsonBody } from '@/lib/api-forward';

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ userId: string }> },
) {
  const { userId } = await ctx.params;

  return forwardAuthed(`/users/${userId}`, {
    method: 'PATCH',
    body: await readJsonBody(request),
  });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ userId: string }> },
) {
  const { userId } = await ctx.params;

  return forwardAuthed(`/users/${userId}`, { method: 'DELETE' });
}

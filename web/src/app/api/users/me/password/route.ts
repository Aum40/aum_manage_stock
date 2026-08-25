import { forwardAuthed, readJsonBody } from '@/lib/api-forward';

export async function PATCH(request: Request) {
  return forwardAuthed('/users/me/password', {
    method: 'PATCH',
    body: await readJsonBody(request),
  });
}

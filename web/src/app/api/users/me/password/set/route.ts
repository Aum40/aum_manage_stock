import { forwardAuthed, readJsonBody } from '@/lib/api-forward';

export async function POST(request: Request) {
  return forwardAuthed('/users/me/password/set', {
    method: 'POST',
    body: await readJsonBody(request),
  });
}

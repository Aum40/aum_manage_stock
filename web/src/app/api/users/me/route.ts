import { forwardAuthed, readJsonBody } from '@/lib/api-forward';

export async function GET() {
  return forwardAuthed('/users/me', { method: 'GET' });
}

export async function PATCH(request: Request) {
  return forwardAuthed('/users/me', {
    method: 'PATCH',
    body: await readJsonBody(request),
  });
}

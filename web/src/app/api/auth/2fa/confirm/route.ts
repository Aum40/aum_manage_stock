import { forwardAuthed, readJsonBody } from '@/lib/api-forward';

export async function POST(request: Request) {
  return forwardAuthed('/auth/2fa/confirm', {
    method: 'POST',
    body: await readJsonBody(request),
  });
}

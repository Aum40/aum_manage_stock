import { forwardAuthed, readJsonBody } from '@/lib/api-forward';

export async function POST(request: Request) {
  return forwardAuthed('/auth/2fa/disable', {
    method: 'POST',
    body: await readJsonBody(request),
  });
}

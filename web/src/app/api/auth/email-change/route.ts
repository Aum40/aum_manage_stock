import { forwardAuthed, readJsonBody } from '@/lib/api-forward';

export async function POST(request: Request) {
  return forwardAuthed('/auth/email-change', {
    method: 'POST',
    body: await readJsonBody(request),
  });
}

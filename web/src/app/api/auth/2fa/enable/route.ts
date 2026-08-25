import { forwardAuthed } from '@/lib/api-forward';

export async function POST() {
  return forwardAuthed('/auth/2fa/enable', { method: 'POST' });
}

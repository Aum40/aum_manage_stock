import { forwardAuthed } from '@/lib/api-forward';

export async function DELETE() {
  return forwardAuthed('/users/me/unlink-line', { method: 'DELETE' });
}

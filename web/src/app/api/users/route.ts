import { forwardAuthed, readJsonBody } from '@/lib/api-forward';

/**
 * สร้างบัญชีพนักงาน — endpoint อยู่ใน UsersModule (ของแพรว) ไม่ใช่ StaffModule
 * หน้า /staff จึงต้องยิง 2 จังหวะ: สร้างบัญชีที่นี่ก่อน แล้วค่อย assign เข้าร้าน
 */
export async function POST(request: Request) {
  return forwardAuthed('/users', {
    method: 'POST',
    body: await readJsonBody(request),
  });
}

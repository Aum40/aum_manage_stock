import { forwardAuthed } from "@/lib/api-forward";

/**
 * ไม่ผ่าน /api/backend/[...path] เพราะ proxy ตัวนั้นอ่าน body เป็น JSON เสมอ
 * (readJsonBody) — อัปโหลดไฟล์ต้องส่ง FormData ตรงๆ เหมือนกับ auth/login ที่
 * แยก route ของตัวเองเช่นกัน
 */
export async function POST(request: Request) {
  const formData = await request.formData();
  return forwardAuthed("/uploads/image", { method: "POST", body: formData });
}

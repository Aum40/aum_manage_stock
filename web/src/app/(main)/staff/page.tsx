import { redirect } from "next/navigation";

import StaffManager from "@/components/features/staff/StaffManager";
import { getAccessTokenCookie } from "@/lib/session-cookies";

/**
 * เช็ค cookie ฝั่ง server ก่อนวาดหน้า
 *
 * ข้อมูลทั้งหมดดึงผ่าน hook ฝั่ง client (lib/hooks/use-staff.ts) ตามแบบทีม
 * แต่ถ้าไม่ดักตรงนี้ คนที่ยังไม่ล็อกอินจะเห็นโครงหน้าเปล่าๆ แล้วค่อยเจอ 401
 * รัวๆ จาก hook แทนที่จะถูกพาไปหน้า login ตั้งแต่แรก
 *
 * ทั้งโปรเจกต์ยังไม่มี middleware กลางที่กันหน้าใน (main) — หน้าอื่นก็เปิดได้
 * ทั้งที่ยังไม่ล็อกอิน แจ้งทีมไว้แล้ว ระหว่างนี้กันเฉพาะหน้าของโมดูลนี้ก่อน
 */
export default async function StaffPage() {
  const token = await getAccessTokenCookie();
  if (!token) redirect("/login");

  return <StaffManager />;
}

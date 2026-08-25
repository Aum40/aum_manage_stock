import { redirect } from "next/navigation";

import StaffManager from "@/components/features/staff/StaffManager";
import { apiGet, ApiAuthError } from "@/lib/api-server";
import type {
  ShopSummary,
  StaffAccount,
  StaffQuota,
} from "@/lib/types/staff";

export default async function StaffPage() {
  let staff: StaffAccount[];
  let quota: StaffQuota;
  let shops: ShopSummary[];

  try {
    // ยิงพร้อมกันเพราะไม่ขึ้นต่อกัน — รอทีละตัวจะช้าขึ้นเป็น 3 เท่าโดยไม่จำเป็น
    [staff, quota, shops] = await Promise.all([
      apiGet<StaffAccount[]>("/staff"),
      apiGet<StaffQuota>("/staff/quota"),
      apiGet<ShopSummary[]>("/shops"),
    ]);
  } catch (error) {
    // Server Component เขียน cookie ไม่ได้ จึง refresh token ที่นี่ไม่ได้
    // (ดูคอมเมนต์ใน lib/api-server.ts) — ส่งไปเข้าสู่ระบบใหม่แทน
    if (error instanceof ApiAuthError) redirect("/login");
    throw error;
  }

  return <StaffManager staff={staff} quota={quota} shops={shops} />;
}

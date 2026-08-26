import { redirect } from "next/navigation";

import ShopsManager from "@/components/features/shops/ShopsManager";
import { getAccessTokenCookie } from "@/lib/session-cookies";

/**
 * เช็ค cookie ฝั่ง server ก่อนวาดหน้า — ตามแบบ (main)/staff/page.tsx
 * ข้อมูลจริงดึงผ่าน hook ฝั่ง client (lib/hooks/use-inventory.ts)
 */
export default async function ShopsPage() {
  const token = await getAccessTokenCookie();
  if (!token) redirect("/login");

  return <ShopsManager />;
}

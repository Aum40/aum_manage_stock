"use client";

import Sidebar from "@/components/layout/Sidebar";
import { getNavSections } from "@/components/layout/nav-config";
import { useMe } from "@/lib/hooks/use-profile";

/**
 * แยกออกมาจาก app/admin/layout.tsx เพราะ Sidebar เป็น client component
 * ส่วน layout ต้องเป็น server component ถึงจะ export metadata ได้
 */
export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: me } = useMe();
  // SRS §29/§186 — เมนู "จัดการ Admin" เป็นของ Super Admin เท่านั้น
  // Admin ทั่วไปต้องไม่เห็น (api ก็ปฏิเสธอยู่แล้ว แต่ไม่ควรโชว์เมนูที่กดไม่ได้)
  const role = me?.role === "SUPER_ADMIN" ? "superadmin" : "admin";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar wordmarkSuffix="Admin" sections={getNavSections(role)} />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}

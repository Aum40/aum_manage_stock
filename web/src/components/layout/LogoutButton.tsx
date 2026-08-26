"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/**
 * /api/auth/logout เพิกถอน refresh token ฝั่ง api แล้วลบ cookie ทั้งสองใบทิ้ง
 * ต้อง router.refresh() ด้วย ไม่งั้น navbar ที่ render ฝั่ง server ยังโชว์ชื่อ
 * คนที่เพิ่งออกจากระบบไปค้างอยู่
 */
export default function LogoutButton({ label }: { label: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const onLogout = async () => {
    setIsPending(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.push("/");
    router.refresh();
  };

  return (
    <Button variant="outline" size="sm" disabled={isPending} onClick={onLogout}>
      {isPending ? "…" : label}
    </Button>
  );
}

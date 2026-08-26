"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";

/**
 * /api/auth/logout เพิกถอน refresh token ฝั่ง api แล้วลบ cookie ทั้งสองใบทิ้ง
 *
 * แค่ cookie หายไม่พอให้หน้าเว็บอัปเดตตาม เพราะ navbar อ่านผู้ใช้จาก react-query
 * ถ้าไม่ล้าง cache ข้อมูลคนที่เพิ่งออกจากระบบจะยังค้างอยู่ — และ router.replace
 * ไปหน้าที่ยืนอยู่แล้วไม่ทำให้ component remount ด้วย
 */
export default function LogoutButton({ label }: { label: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const onLogout = async () => {
    setIsPending(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        keepalive: true,
      }).catch(() => null);

      queryClient.clear();
      router.replace("/");
      router.refresh();
    } finally {
      // ต้องคืนค่าเสมอ ไม่งั้นถ้าปุ่มไม่ถูก unmount (เช่นกด logout ตอนอยู่หน้าแรก
      // อยู่แล้ว replace ไม่ได้พาไปไหน) ปุ่มจะค้างเป็น "…" ตลอดไป
      setIsPending(false);
    }
  };

  return (
    <Button variant="outline" size="sm" disabled={isPending} onClick={onLogout}>
      {isPending ? "…" : label}
    </Button>
  );
}

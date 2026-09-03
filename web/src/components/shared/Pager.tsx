"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/i18n/LocaleContext";

const content = {
  th: {
    prev: "ก่อนหน้า",
    next: "ถัดไป",
    page: "หน้า",
    of: "จาก",
  },
  en: {
    prev: "Previous",
    next: "Next",
    page: "Page",
    of: "of",
  },
};

/**
 * แถบเปลี่ยนหน้าของตารางที่ต่อกับ meta ของ api (page/limit/total/totalPages)
 *
 * ไม่ทำเป็นปุ่มเลขหน้าเรียงกัน — ตารางฝั่งแอดมินมีตัวกรองอยู่แล้ว การไล่ทีละหน้า
 * พอสำหรับการใช้งานจริง และไม่ต้องมาคิดว่าจะย่อเลขหน้ายังไงตอนมี 200 หน้า
 *
 * ซ่อนตัวเองเมื่อมีหน้าเดียว — ตารางส่วนใหญ่ในระบบยังข้อมูลน้อย
 */
export default function Pager({
  page,
  totalPages,
  isLoading,
  onChange,
}: {
  page: number;
  totalPages: number;
  isLoading?: boolean;
  onChange: (page: number) => void;
}) {
  const { locale } = useLocale();
  const t = content[locale];

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-end gap-3">
      <span className="text-[13px] text-muted-foreground">
        {t.page} {page} {t.of} {totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading || page <= 1}
          onClick={() => onChange(page - 1)}
        >
          {t.prev}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading || page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          {t.next}
        </Button>
      </div>
    </div>
  );
}

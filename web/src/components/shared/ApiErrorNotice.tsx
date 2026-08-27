"use client";

import Link from "next/link";

import { ApiError } from "@/lib/api-client";
import { useLocale } from "@/components/i18n/LocaleContext";

/**
 * แถบ error ที่พาไปแก้ต้นเหตุได้ ไม่ใช่แค่บอกว่าพัง
 *
 * ข้อความภาษาไทยมาจาก MESSAGE_TH ใน lib/api-error.ts อยู่แล้ว (api-client แปลง
 * ทุก error ผ่านตรงนั้นก่อนโยนเป็น ApiError) ที่นี่จึงไม่แปลซ้ำ — หน้าที่เดียว
 * คือดู `code` แล้วเติมทางออกให้ถูกเรื่อง
 *
 * SHOP_PAUSED เป็นเคสที่ผู้ใช้แก้เองได้ใน 2 คลิก แต่ต้องรู้ก่อนว่าไปกดที่ไหน
 * บอกแค่ "ร้านนี้ถูกพักอยู่" แล้วปล่อยให้ไปหาเองคือการผลักภาระให้ผู้ใช้
 */

export type ApiFailure = { message: string; code?: string };

export function toApiFailure(caught: unknown): ApiFailure {
  if (caught instanceof ApiError) {
    return { message: caught.message, code: caught.code };
  }
  return {
    message: caught instanceof Error ? caught.message : String(caught),
  };
}

const content = {
  th: { resume: "ไปเปิดร้าน →" },
  en: { resume: "Resume the shop →" },
};

export function ApiErrorNotice({
  error,
  fallback,
}: {
  error: ApiFailure | null;
  /** ข้อความที่หน้านั้นตรวจเองได้ก่อนยิง api เช่น "จำนวนเกินของที่มีอยู่" */
  fallback?: string;
}) {
  const { locale } = useLocale();
  const t = content[locale];

  if (!error && !fallback) return null;

  return (
    <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {error?.message ?? fallback}
      {error?.code === "SHOP_PAUSED" && (
        <Link
          href="/shops"
          className="ml-2 font-semibold whitespace-nowrap underline underline-offset-4"
        >
          {t.resume}
        </Link>
      )}
    </p>
  );
}

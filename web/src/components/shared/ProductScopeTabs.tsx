"use client";

import Link from "next/link";

import { useLocale } from "@/components/i18n/LocaleContext";
import { useMe } from "@/lib/hooks/use-profile";

/**
 * สวิตช์สลับมุมมองสินค้า — "ร้านนี้" กับ "ทุกร้าน" คือหน้าเดียวกันในสายตาผู้ใช้
 * แต่คนละ route กันจริง เพราะสองตารางนี้มีคอลัมน์คนละชุด
 *
 * ราคาขาย / คงเหลือ / สถานะ เป็นค่าราย shop_products สินค้าตัวเดียวที่ขาย 5 ร้าน
 * มี 5 ราคา 5 สต็อก ยัดลงตารางเดียวไม่ได้โดยไม่โกหก จึงแยกตารางแต่รวมเมนู
 *
 * พนักงานไม่เห็นสวิตช์นี้ — เมนูของ staff ไม่มีแคตตาล็อกกลางตั้งแต่แรก
 * (nav-config.ts) เพราะแคตตาล็อกเป็นของบัญชีเจ้าของร้าน ไม่ใช่ของร้านที่ตัวเองดูแล
 */

const content = {
  th: { shop: "ร้านนี้", all: "ทุกร้าน" },
  en: { shop: "This shop", all: "All shops" },
};

const TABS = [
  { key: "shop", href: "/products" },
  { key: "all", href: "/catalog" },
] as const;

export function ProductScopeTabs({ active }: { active: "shop" | "all" }) {
  const { locale } = useLocale();
  const t = content[locale];
  const meQuery = useMe();

  if (meQuery.data?.role === "SHOP_STAFF") return null;

  return (
    <div
      role="tablist"
      className="inline-flex w-fit gap-1 rounded-full bg-muted p-1"
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            role="tab"
            aria-selected={isActive}
            className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t[tab.key]}
          </Link>
        );
      })}
    </div>
  );
}

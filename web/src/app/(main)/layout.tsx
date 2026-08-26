"use client";

import Sidebar from "@/components/layout/Sidebar";
import QuotaMeter from "@/components/shared/QuotaMeter";
import { Button } from "@/components/ui/button";
import { getNavSections } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useShops } from "@/lib/hooks/use-inventory";

// Hardcoded to the "owner on Plus plan" state for this scaffolding pass —
// every page under (main) shares this one sidebar. Pages that demonstrate a
// different plan/role state (dashboard/expired, products/limit,
// membership/free, etc.) intentionally do NOT get a matching sidebar yet;
// wiring the sidebar to real session/plan data is left to auth-resource +
// subscriptions-resource, not this branch.
const role = "owner" as const;

const content = {
  th: {
    shopSelectorLabel: "ร้านที่เข้าใช้งานอยู่",
    shopName: "อุ้มมินิมาร์ท สาขาลาดพร้าว",
    planLabel: "PLUS PLAN",
    quotaShop: "ร้าน",
    quotaProduct: "สินค้า",
    manageBtn: "จัดการแพ็กเกจ",
  },
  en: {
    shopSelectorLabel: "Currently viewing",
    shopName: "Aum Minimart — Lat Phrao Branch",
    planLabel: "PLUS PLAN",
    quotaShop: "Shops",
    quotaProduct: "Products",
    manageBtn: "Manage Plan",
  },
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale } = useLocale();
  const t = content[locale];
  const shopsQuery = useShops();
  const currentShopName = shopsQuery.data?.[0]?.name ?? t.shopName;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        sections={getNavSections(role)}
        shopSelector={
          <div className="rounded-xl bg-white/5 p-3">
            <div className="mb-1 text-[10px] tracking-[0.08em] text-white/40 uppercase">
              {t.shopSelectorLabel}
            </div>
            <div className="text-[13px] font-semibold text-white/90">
              {currentShopName}
            </div>
          </div>
        }
        footer={
          <div className="rounded-xl bg-white/5 p-3">
            <div className="mb-1.5 text-[10px] font-bold tracking-widest text-primary uppercase">
              {t.planLabel}
            </div>
            <div className="mb-2.5 flex flex-col gap-2">
              <QuotaMeter label={t.quotaShop} used={2} total={3} onDark />
              <QuotaMeter label={t.quotaProduct} used={412} total={3000} onDark />
            </div>
            <Button variant="gradient" size="sm" className="w-full">
              {t.manageBtn}
            </Button>
          </div>
        }
      />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}

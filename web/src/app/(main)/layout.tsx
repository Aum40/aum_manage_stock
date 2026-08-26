"use client";

import Sidebar from "@/components/layout/Sidebar";
import QuotaMeter from "@/components/shared/QuotaMeter";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getNavSections } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useMySubscription, useShops } from "@/lib/hooks/use-inventory";

const role = "owner" as const;

const content = {
  th: {
    shopSelectorLabel: "ร้านที่เข้าใช้งานอยู่",
    shopName: "ยังไม่ได้เลือกร้าน",
    planLabel: "แพ็กเกจ",
    quotaShop: "ร้าน",
    quotaProduct: "สินค้า",
    manageBtn: "จัดการแพ็กเกจ",
  },
  en: {
    shopSelectorLabel: "Currently viewing",
    shopName: "No shop selected",
    planLabel: "Plan",
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
  const subscriptionQuery = useMySubscription();
  const currentShopName = shopsQuery.data?.[0]?.name ?? t.shopName;
  const subscription = subscriptionQuery.data;
  const planName = subscription?.subscription.plan.code ?? "—";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        sections={getNavSections(role)}
        shopSelector={shopsQuery.data && shopsQuery.data.length > 0 ? (
          <div className="rounded-xl bg-white/5 p-3">
            <div className="mb-1 text-[10px] tracking-[0.08em] text-white/40 uppercase">
              {t.shopSelectorLabel}
            </div>
            <div className="text-[13px] font-semibold text-white/90">
              {currentShopName}
            </div>
          </div>
        ) : undefined}
        footer={
          <div className="rounded-xl bg-white/5 p-3">
            <div className="mb-1.5 text-[10px] font-bold tracking-widest text-primary uppercase">
              {planName} {planName !== "—" ? t.planLabel : ""}
            </div>
            <div className="mb-2.5 flex flex-col gap-2">
              <QuotaMeter label={t.quotaShop} used={subscription?.quotas.shop.used ?? 0} total={subscription?.quotas.shop.allowed ?? 0} onDark />
              <QuotaMeter label={t.quotaProduct} used={subscription?.quotas.product.used ?? 0} total={subscription?.quotas.product.allowed ?? 0} onDark />
            </div>
            <Button variant="gradient" size="sm" className="w-full" render={<Link href="/membership" />}>
              {t.manageBtn}
            </Button>
          </div>
        }
      />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}

"use client";

import Sidebar from "@/components/layout/Sidebar";
import QuotaMeter from "@/components/shared/QuotaMeter";
import {
  SelectedShopProvider,
  useSelectedShop,
} from "@/components/shared/SelectedShopContext";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
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
  return (
    <SelectedShopProvider>
      <MainLayoutInner>{children}</MainLayoutInner>
    </SelectedShopProvider>
  );
}

function MainLayoutInner({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale();
  const t = content[locale];
  const shopsQuery = useShops();
  const subscriptionQuery = useMySubscription();
  const { selectedShopId, setSelectedShopId } = useSelectedShop();
  const shops = shopsQuery.data ?? [];
  // ยังไม่เคยเลือก (หรือร้านที่เคยเลือกถูกลบไปแล้ว) — fallback ไปร้านแรกในลิสต์
  const activeShopId =
    (selectedShopId && shops.some((s) => s.id === selectedShopId)
      ? selectedShopId
      : shops[0]?.id) ?? "";
  const subscription = subscriptionQuery.data;
  const planName = subscription?.subscription.plan.code ?? "—";
  // Base UI ให้ <Select.Value /> แสดง "ค่า" ที่เลือก ไม่ใช่ข้อความใน <SelectItem>
  // ถ้าใช้ตรงๆ จะได้ UUID ของร้านโผล่ในไซด์บาร์ จึงเรนเดอร์ชื่อร้านเอง
  const activeShopName =
    shops.find((s) => s.id === activeShopId)?.name ?? t.shopName;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        sections={getNavSections(role)}
        shopSelector={shops.length > 0 ? (
          <div className="rounded-xl bg-white/5 p-3">
            <div className="mb-1 text-[10px] tracking-[0.08em] text-white/40 uppercase">
              {t.shopSelectorLabel}
            </div>
            <Select
              value={activeShopId}
              onValueChange={(value) => {
                if (value) setSelectedShopId(value);
              }}
            >
              <SelectTrigger className="w-full border-white/10 bg-transparent text-[13px] font-semibold text-white/90 hover:bg-white/5">
                <span className="flex-1 truncate text-left">{activeShopName}</span>
              </SelectTrigger>
              <SelectContent>
                {shops.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id}>
                    {shop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : undefined}
        footer={
          <div className="rounded-xl bg-white/5 p-3">
            <div className="mb-1.5 text-[10px] font-bold tracking-widest text-primary uppercase">
              {planName} {planName !== "—" ? t.planLabel : ""}
            </div>
            <div className="mb-2.5 flex flex-col gap-2">
              <QuotaMeter label={t.quotaShop} used={subscription?.quotas.shop.used ?? 0} total={subscription?.quotas.shop.allowed ?? 0} onDark />
              <QuotaMeter label={t.quotaProduct} used={subscription?.quotas.product.used ?? 0} total={subscription?.quotas.product.allowed ?? null} onDark />
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

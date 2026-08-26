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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getNavSections, type SidebarRole } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useMySubscription, useShops } from "@/lib/hooks/use-inventory";
import { useMe } from "@/lib/hooks/use-profile";
import type { CurrentUser } from "@/lib/types/user";
import SessionRefresher from "@/components/auth/SessionRefresher";

/**
 * เมนูใน sidebar ขึ้นกับทั้ง "บทบาท" และ "สถานะแพ็กเกจ" — พนักงานเห็นคนละชุดกับ
 * เจ้าของร้าน ส่วนเจ้าของร้านยังแยกอีกว่าอยู่ Free (บางเมนูล็อก), หมดอายุ
 * (อ่านอย่างเดียว) หรือปกติ
 *
 * readOnly คำนวณจาก status/expires_at ที่ api ส่งมาให้แล้ว ไม่ใช่คอลัมน์ใน DB
 * จึงต้องอ่านจาก /subscriptions/me ทุกครั้ง ไม่ควรเดาจาก plan code เอง
 */
function resolveSidebarRole(
  user: CurrentUser | undefined,
  plan: { code: string } | undefined,
  readOnly: boolean,
): SidebarRole {
  if (user?.role === "SUPER_ADMIN") return "superadmin";
  if (user?.role === "ADMIN") return "admin";
  if (user?.role === "SHOP_STAFF") return "staff";
  if (readOnly) return "expired";
  if (plan?.code === "FREE") return "free";
  return "owner";
}

const content = {
  th: {
    shopSelectorLabel: "ร้านที่เข้าใช้งานอยู่",
    shopName: "ยังไม่ได้เลือกร้าน",
    planLabel: "แพ็กเกจ",
    quotaShop: "ร้าน",
    quotaProduct: "สินค้า",
    manageBtn: "จัดการแพ็กเกจ",
    readOnlyNotice:
      "แพ็กเกจหมดอายุแล้ว ตอนนี้ดูข้อมูลได้อย่างเดียว แก้ไขหรือบันทึกรายการใหม่ไม่ได้",
    readOnlyAction: "ต่ออายุแพ็กเกจ",
  },
  en: {
    shopSelectorLabel: "Currently viewing",
    shopName: "No shop selected",
    planLabel: "Plan",
    quotaShop: "Shops",
    quotaProduct: "Products",
    manageBtn: "Manage Plan",
    readOnlyNotice:
      "Your plan has expired. The shop is read-only — you can view data but not edit or record anything new.",
    readOnlyAction: "Renew your plan",
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
  const meQuery = useMe();
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
  const planName = subscription
    ? locale === "th"
      ? subscription.subscription.plan.nameTh
      : ({ FREE: "Free", PLUS: "Plus", PRO: "Pro" }[
          subscription.subscription.plan.code
        ] ?? subscription.subscription.plan.code)
    : "—";
  const readOnly = subscription?.readOnly ?? false;
  const role = resolveSidebarRole(
    meQuery.data,
    subscription?.subscription.plan,
    readOnly,
  );
  // พนักงานจ่ายเงินหรืออัปเกรดแพ็กเกจแทนเจ้าของร้านไม่ได้ (SRS §126)
  const isStaff = role === "staff";
  // Base UI ให้ <Select.Value /> แสดง "ค่า" ที่เลือก ไม่ใช่ข้อความใน <SelectItem>
  // ถ้าใช้ตรงๆ จะได้ UUID ของร้านโผล่ในไซด์บาร์ จึงเรนเดอร์ชื่อร้านเอง
  const activeShopName =
    shops.find((s) => s.id === activeShopId)?.name ?? t.shopName;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SessionRefresher />
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
        footer={isStaff ? undefined : (
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
        )}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/*
          api บล็อกการแก้ไขทุกอย่างเมื่อแพ็กเกจหมดอายุอยู่แล้ว ถ้าไม่บอกตรงนี้
          ผู้ใช้จะเห็นแค่ error ดิบๆ ตอนกดบันทึกโดยไม่รู้ว่าทำไม
        */}
        {readOnly && (
          <Alert variant="destructive" className="rounded-none border-0 border-b border-destructive/20">
            <AlertDescription>
              {t.readOnlyNotice}{" "}
              <Link href="/membership" className="font-bold underline">
                {t.readOnlyAction}
              </Link>
            </AlertDescription>
          </Alert>
        )}
        {children}
      </div>
    </div>
  );
}

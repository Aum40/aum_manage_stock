"use client";

import Link from "next/link";

import TopBar from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import QuotaMeter from "@/components/shared/QuotaMeter";
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";

const content = {
  th: {
    title: "สมาชิกและการชำระเงิน",
    currentPlanLabel: "แพ็กเกจปัจจุบัน",
    freeNote: "ใช้งานได้ตลอดไป ไม่มีวันหมดอายุ",
    quotaShop: "ร้านค้า",
    quotaShopHint: "ใช้สิทธิ์ครบแล้ว",
    quotaProduct: "สินค้า",
    quotaProductHint: "เหลืออีก 22 รายการ",
    quotaStaff: "พนักงาน",
    quotaStaffHint: "Free Plan ไม่รองรับพนักงาน",
    upgradeHeading: "อัปเกรดเพื่อปลดล็อกฟีเจอร์เพิ่มเติม",
    perYear: "ต่อปี",
    historyHeading: "ประวัติการชำระเงิน",
    emptyTitle: "ยังไม่มีประวัติการชำระเงิน",
    emptySub: "เมื่ออัปเกรดแพ็กเกจ ทุกรายการจะแสดงในตารางนี้",
    plans: [
      { key: "plus", label: "PLUS", price: "฿2,499", limits: [["ร้าน", "3 ร้าน"], ["สินค้า", "3,000 รายการ"], ["พนักงาน", "6 บัญชี"]], highlighted: true, btn: "เลือก Plus →" },
      { key: "pro", label: "PRO", price: "฿3,499", limits: [["ร้าน", "5 ร้าน"], ["สินค้า", "5,000 รายการ"], ["พนักงาน", "10 บัญชี"]], highlighted: false, btn: "เลือก Pro →" },
    ],
    recommended: "แนะนำ",
  },
  en: {
    title: "Membership & Billing",
    currentPlanLabel: "Current Plan",
    freeNote: "Usable forever, never expires",
    quotaShop: "Shops",
    quotaShopHint: "Fully used",
    quotaProduct: "Products",
    quotaProductHint: "22 remaining",
    quotaStaff: "Staff",
    quotaStaffHint: "Free Plan doesn't support staff",
    upgradeHeading: "Upgrade to Unlock More Features",
    perYear: "per year",
    historyHeading: "Payment History",
    emptyTitle: "No payment history yet",
    emptySub: "Once you upgrade, every transaction will show up in this table.",
    plans: [
      { key: "plus", label: "PLUS", price: "฿2,499", limits: [["Shops", "3 shops"], ["Products", "3,000 items"], ["Staff", "6 accounts"]], highlighted: true, btn: "Choose Plus →" },
      { key: "pro", label: "PRO", price: "฿3,499", limits: [["Shops", "5 shops"], ["Products", "5,000 items"], ["Staff", "10 accounts"]], highlighted: false, btn: "Choose Pro →" },
    ],
    recommended: "Recommended",
  },
};

export default function MembershipFreePage() {
  const { locale } = useLocale();
  const t = content[locale];

  return (
    <>
      <TopBar title={t.title} user={roleAvatar.free[locale]} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="flex flex-col gap-5">
          <Card>
            <div className="grid grid-cols-1 gap-6 px-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 text-[11px] tracking-widest text-muted-foreground uppercase">
                  {t.currentPlanLabel}
                </div>
                <div className="mb-1.5 font-heading text-3xl font-bold tracking-[-0.01em] text-primary">
                  FREE PLAN
                </div>
                <div className="text-[13px] text-muted-foreground">{t.freeNote}</div>
              </div>
              <div className="flex flex-col gap-3.5 border-l border-border pl-6">
                <QuotaMeter label={t.quotaShop} used={1} total={1} caption={t.quotaShopHint} />
                <QuotaMeter label={t.quotaProduct} used={78} total={100} caption={t.quotaProductHint} />
                <QuotaMeter label={t.quotaStaff} used={0} total={0} caption={t.quotaStaffHint} />
              </div>
            </div>
          </Card>

          <div>
            <div className="mb-3 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
              {t.upgradeHeading}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {t.plans.map((p) => (
                <div
                  key={p.key}
                  className={`relative rounded-2xl p-6 ${
                    p.highlighted
                      ? "border-[1.5px] border-primary bg-background shadow-[0_4px_20px_rgba(245,163,28,0.15)]"
                      : "bg-secondary"
                  }`}
                >
                  {p.highlighted && (
                    <span className="absolute -top-2.75 left-5 rounded-full bg-linear-to-br from-brand-orange to-brand-orange/70 px-3 py-0.75 text-[10px] font-bold text-white">
                      {t.recommended}
                    </span>
                  )}
                  <div className="mb-1.5 text-[11px] font-bold tracking-[0.12em] text-primary uppercase">
                    {p.label}
                  </div>
                  <div className="mb-0.5 font-mono text-2xl font-bold tracking-[-0.01em]">
                    {p.price}
                  </div>
                  <div className="mb-4 text-xs text-muted-foreground">{t.perYear}</div>
                  {p.limits.map(([l, v]) => (
                    <div
                      key={l}
                      className="flex justify-between border-b border-border/60 py-1.5 text-[13px]"
                    >
                      <span className="text-muted-foreground">{l}</span>
                      <span className="font-semibold">{v}</span>
                    </div>
                  ))}
                  <Button
                    variant={p.highlighted ? "gradient" : "outline"}
                    className="mt-4 w-full"
                    render={<Link href="/membership/upgrade" />}
                  >
                    {p.btn}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
              {t.historyHeading}
            </div>
            <div className="rounded-3xl bg-secondary px-6 py-10 text-center">
              <div className="text-sm text-muted-foreground">{t.emptyTitle}</div>
              <div className="mt-1.5 text-xs text-muted-foreground/60">
                {t.emptySub}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

"use client";

import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useCreateSubscriptionPayment } from "@/lib/hooks/use-inventory";

const content = {
  th: {
    title: "อัปเกรดแพ็กเกจ",
    heading: "เลือกแพ็กเกจที่ใช่สำหรับร้านคุณ",
    subheading: "ตอนนี้คุณอยู่ Free Plan — อัปเกรดเพื่อเพิ่มร้าน สินค้า และปลดล็อกฟีเจอร์",
    lifelong: "ตลอดชีพ",
    perYear: "ต่อปี",
    recommended: "แนะนำ",
    currentPlanBtn: "แพ็กเกจปัจจุบัน",
    choosePlusBtn: "เลือก Plus →",
    chooseProBtn: "เลือก Pro →",
    footerNote:
      "ร้านและสินค้าที่มีอยู่แล้วจะถูกเก็บไว้เต็มจำนวนเมื่ออัปเกรดแพ็กเกจ ไม่มีการหักข้อมูลเก่าใดๆ",
    features: [
      { label: "จำนวนร้านค้า", free: "1", plus: "3", pro: "5" },
      { label: "สินค้าสูงสุด", free: "100", plus: "3,000", pro: "5,000" },
      { label: "บัญชีพนักงาน", free: "✗", plus: "6", pro: "10" },
      { label: "บันทึกสต็อกแบบ manual", free: "✓", plus: "✓", pro: "✓" },
      { label: "ประวัติการเคลื่อนไหวสต็อก", free: "✓", plus: "✓", pro: "✓" },
      { label: "แดชบอร์ดพื้นฐาน", free: "✓", plus: "✓", pro: "✓" },
      { label: "สแกนบาร์โค้ดขายหน้าร้าน", free: "✗", plus: "✓", pro: "✓" },
      { label: "แชทบอทรับสต็อก (LINE)", free: "✗", plus: "✓", pro: "✓" },
      { label: "รายงานเชิงลึก", free: "✗", plus: "✓", pro: "✓" },
      { label: "คำแนะนำจาก AI", free: "✗", plus: "✗", pro: "✓" },
      { label: "ซื้อสิทธิ์ร้านเพิ่ม", free: "✗", plus: "✓", pro: "✓" },
    ],
  },
  en: {
    title: "Upgrade Plan",
    heading: "Choose the Right Plan for Your Shop",
    subheading: "You're currently on the Free Plan — upgrade to add shops, products, and unlock features.",
    lifelong: "Lifetime",
    perYear: "per year",
    recommended: "Recommended",
    currentPlanBtn: "Current Plan",
    choosePlusBtn: "Choose Plus →",
    chooseProBtn: "Choose Pro →",
    footerNote:
      "Existing shops and products are kept in full when you upgrade — nothing is ever deducted.",
    features: [
      { label: "Number of Shops", free: "1", plus: "3", pro: "5" },
      { label: "Max Products", free: "100", plus: "3,000", pro: "5,000" },
      { label: "Staff Accounts", free: "✗", plus: "6", pro: "10" },
      { label: "Manual Stock Entry", free: "✓", plus: "✓", pro: "✓" },
      { label: "Stock Movement History", free: "✓", plus: "✓", pro: "✓" },
      { label: "Basic Dashboard", free: "✓", plus: "✓", pro: "✓" },
      { label: "Barcode Scanning (POS)", free: "✗", plus: "✓", pro: "✓" },
      { label: "Stock Chatbot (LINE)", free: "✗", plus: "✓", pro: "✓" },
      { label: "Advanced Reports", free: "✗", plus: "✓", pro: "✓" },
      { label: "AI Recommendations", free: "✗", plus: "✗", pro: "✓" },
      { label: "Buy Extra Shop Slots", free: "✗", plus: "✓", pro: "✓" },
    ],
  },
};

function Cell({ val }: { val: string }) {
  if (val === "✓")
    return <span className="text-base font-bold text-status-green">✓</span>;
  if (val === "✗")
    return <span className="text-base font-bold text-border">✗</span>;
  return <span className="font-mono text-[13px] font-semibold">{val}</span>;
}

export default function UpgradePlanPage() {
  const { locale } = useLocale();
  const t = content[locale];
  const createPayment = useCreateSubscriptionPayment();

  const startCheckout = (planCode: "PLUS" | "PRO") => {
    if (createPayment.isPending) return;
    createPayment.mutate(planCode, {
      onSuccess: ({ checkoutUrl }) => {
        window.location.assign(checkoutUrl);
      },
    });
  };

  return (
    <>
      <TopBar title={t.title} user={roleAvatar.free[locale]} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h2 className="mb-2 font-heading text-2xl font-bold text-foreground">
              {t.heading}
            </h2>
            <p className="text-sm text-muted-foreground">{t.subheading}</p>
          </div>

          <div className="overflow-hidden rounded-3xl bg-secondary">
            <div className="overflow-x-auto">
              <table className="w-full min-w-125 border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-1/3 px-6 py-6 text-left" />
                  <th className="px-4 py-6 text-center align-bottom">
                    <div className="mb-1.5 text-[11px] font-bold tracking-[0.12em] text-primary uppercase">
                      FREE
                    </div>
                    <div className="font-mono text-2xl font-bold tracking-[-0.02em]">
                      ฿0
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t.lifelong}
                    </div>
                  </th>
                  <th className="relative bg-primary/7 px-4 py-6 text-center align-bottom">
                    <span className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-linear-to-br from-brand-orange to-brand-orange/70 px-2.5 py-0.5 text-[10px] font-bold whitespace-nowrap text-white">
                      {t.recommended}
                    </span>
                    <div className="mt-3 mb-1.5 text-[11px] font-bold tracking-[0.12em] text-primary uppercase">
                      PLUS
                    </div>
                    <div className="font-mono text-2xl font-bold tracking-[-0.02em]">
                      ฿2,499
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t.perYear}
                    </div>
                  </th>
                  <th className="px-4 py-6 text-center align-bottom">
                    <div className="mb-1.5 text-[11px] font-bold tracking-[0.12em] text-primary uppercase">
                      PRO
                    </div>
                    <div className="font-mono text-2xl font-bold tracking-[-0.02em]">
                      ฿3,499
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t.perYear}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {t.features.map((f) => (
                  <tr key={f.label} className="border-t border-border">
                    <td className="px-6 py-3.5 text-foreground">{f.label}</td>
                    <td className="px-4 py-3.5 text-center">
                      <Cell val={f.free} />
                    </td>
                    <td className="bg-primary/7 px-4 py-3.5 text-center">
                      <Cell val={f.plus} />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <Cell val={f.pro} />
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-border">
                  <td className="px-6 py-5" />
                  <td className="px-4 py-5 text-center">
                    <Button variant="secondary" disabled className="opacity-50">
                      {t.currentPlanBtn}
                    </Button>
                  </td>
                  <td className="bg-primary/7 px-4 py-5 text-center">
                    <Button
                      variant="gradient"
                      disabled={createPayment.isPending}
                      onClick={() => startCheckout("PLUS")}
                    >
                      {t.choosePlusBtn}
                    </Button>
                  </td>
                  <td className="px-4 py-5 text-center">
                    <Button
                      variant="dark"
                      disabled={createPayment.isPending}
                      onClick={() => startCheckout("PRO")}
                    >
                      {t.chooseProBtn}
                    </Button>
                  </td>
                </tr>
              </tbody>
              </table>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {t.footerNote}
          </p>
        </div>
      </main>
    </>
  );
}

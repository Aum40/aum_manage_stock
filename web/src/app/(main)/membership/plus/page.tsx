"use client";

import Link from "next/link";

import TopBar from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import QuotaMeter from "@/components/shared/QuotaMeter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";

const content = {
  th: {
    title: "สมาชิกและการชำระเงิน",
    currentPlanLabel: "แพ็กเกจปัจจุบัน",
    activeLabel: "กำลังใช้งาน",
    expiresText: "หมดอายุ 12 มี.ค. 2570 (เหลือ 207 วัน)",
    quotaShop: "ร้านค้า",
    quotaShopHint: "สร้างได้อีก 1 ร้าน",
    quotaProduct: "สินค้า",
    quotaStaff: "พนักงาน",
    quotaStaffHint: "เพิ่มได้อีก 2 บัญชี",
    renewHeading: "ต่ออายุแพ็กเกจ",
    renewPlan: "Plus รายปี",
    renewBtn: "ต่ออายุตอนนี้ →",
    renewNote: "ระบบจะเก็บวันคงเหลือของอีเมลล่วงหน้าต่อวันหมดอายุ",
    buyExtraHeading: "ซื้อสิทธิ์ร้านเพิ่ม",
    buyExtraSub: "ซื้อเพิ่มได้ทุกจำนวนร้าน สิทธิ์สะสมหมดอายุตามรอบบิล",
    payBtn: "ชำระเงิน →",
    nudgeTitle: "อยากได้ 5 ร้านและคำแนะนำ AI เพิ่มไหม?",
    nudgeSub: "อัปเกรดเป็น Pro เพิ่มเพียง ฿1,000 ต่อปี",
    nudgeBtn: "ดูรายละเอียด Pro →",
    historyHeading: "ประวัติการชำระเงิน",
    columns: ["วันที่", "รายการ", "จำนวน", "ยอด", "สถานะ"],
    paidLabel: "ชำระแล้ว",
    payHistory: [
      { date: "15 ส.ค. 2569", item: "ซื้อสิทธิ์ร้านเพิ่ม", qty: 1, amount: "฿590.00" },
      { date: "12 มี.ค. 2569", item: "ต่ออายุ Plus รายปี", qty: 1, amount: "฿2,499.00" },
      { date: "12 มี.ค. 2568", item: "อัปเกรดจาก Free เป็น Plus", qty: 1, amount: "฿2,499.00" },
    ],
  },
  en: {
    title: "Membership & Billing",
    currentPlanLabel: "Current Plan",
    activeLabel: "Active",
    expiresText: "Expires Mar 12, 2027 (207 days left)",
    quotaShop: "Shops",
    quotaShopHint: "1 more shop available",
    quotaProduct: "Products",
    quotaStaff: "Staff",
    quotaStaffHint: "2 more accounts available",
    renewHeading: "Renew Plan",
    renewPlan: "Plus Annual",
    renewBtn: "Renew Now →",
    renewNote: "Renewing early adds the remaining days onto the new expiry date.",
    buyExtraHeading: "Buy Extra Shop Slots",
    buyExtraSub: "Buy any quantity of extra slots; purchased slots expire with your billing cycle.",
    payBtn: "Pay →",
    nudgeTitle: "Want 5 shops and AI recommendations?",
    nudgeSub: "Upgrade to Pro for just ฿1,000 more a year",
    nudgeBtn: "See Pro Details →",
    historyHeading: "Payment History",
    columns: ["Date", "Item", "Qty", "Amount", "Status"],
    paidLabel: "Paid",
    payHistory: [
      { date: "Aug 15, 2026", item: "Bought extra shop slot", qty: 1, amount: "฿590.00" },
      { date: "Mar 12, 2026", item: "Renewed Plus Annual", qty: 1, amount: "฿2,499.00" },
      { date: "Mar 12, 2025", item: "Upgraded Free to Plus", qty: 1, amount: "฿2,499.00" },
    ],
  },
};

export default function MembershipPlusPage() {
  const { locale } = useLocale();
  const t = content[locale];

  return (
    <>
      <TopBar title={t.title} user={roleAvatar.owner[locale]} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="flex flex-col gap-5">
          <Card>
            <div className="grid grid-cols-1 gap-6 px-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 text-[11px] tracking-widest text-muted-foreground uppercase">
                  {t.currentPlanLabel}
                </div>
                <div className="mb-2.5 font-heading text-3xl font-bold tracking-[-0.01em] text-primary">
                  PLUS PLAN
                </div>
                <div className="flex items-center gap-2.5">
                  <Badge variant="success">{t.activeLabel}</Badge>
                  <span className="text-[13px] text-muted-foreground">
                    {t.expiresText}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-3.5 border-l border-border pl-6">
                <QuotaMeter label={t.quotaShop} used={2} total={3} caption={t.quotaShopHint} />
                <QuotaMeter label={t.quotaProduct} used={412} total={3000} />
                <QuotaMeter label={t.quotaStaff} used={4} total={6} caption={t.quotaStaffHint} />
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <div className="px-4">
                <div className="mb-4 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                  {t.renewHeading}
                </div>
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm">{t.renewPlan}</span>
                  <span className="font-mono text-lg font-bold">฿2,499</span>
                </div>
                <Button variant="gradient">{t.renewBtn}</Button>
                <div className="mt-2.5 text-xs text-muted-foreground">
                  {t.renewNote}
                </div>
              </div>
            </Card>

            <Card>
              <div className="px-4">
                <div className="mb-1 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                  {t.buyExtraHeading}
                </div>
                <p className="mb-3.5 text-[13px] text-muted-foreground">
                  {t.buyExtraSub}
                </p>
                <div className="mb-3.5">
                  <Select defaultValue="1">
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 — ฿590</SelectItem>
                      <SelectItem value="2">2 — ฿1,080</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="dark">{t.payBtn}</Button>
              </div>
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between px-4">
              <div>
                <div className="text-[15px] font-semibold">{t.nudgeTitle}</div>
                <div className="mt-0.5 text-[13px] text-muted-foreground">
                  {t.nudgeSub}
                </div>
              </div>
              <Button variant="dark" render={<Link href="/membership/upgrade" />}>
                {t.nudgeBtn}
              </Button>
            </div>
          </Card>

          <div>
            <div className="mb-3 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
              {t.historyHeading}
            </div>
            <Card className="p-0 overflow-x-auto">
              <table className="w-full min-w-125 border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {t.columns.map((h, i) => (
                      <th
                        key={h}
                        className={`px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase ${
                          i === 2 || i === 3 ? "text-right" : "text-left"
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {t.payHistory.map((r, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{r.date}</td>
                      <td className="px-5 py-3">{r.item}</td>
                      <td className="px-5 py-3 text-right font-mono text-[13px]">{r.qty}</td>
                      <td className="px-5 py-3 text-right font-mono text-[13px] font-semibold">{r.amount}</td>
                      <td className="px-5 py-3"><Badge variant="success">{t.paidLabel}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}

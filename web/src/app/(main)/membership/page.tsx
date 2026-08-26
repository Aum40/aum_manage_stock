"use client";

import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useMySubscription, usePayments } from "@/lib/hooks/use-inventory";

const content = {
  th: {
    title: "สมาชิกและการชำระเงิน",
    bannerBody:
      "เมื่อเข้าใกล้วันหมดอายุ ระบบจะแจ้งเตือนล่วงหน้าอย่างเดียว — ดูข้อมูล สต็อก ประวัติ และแดชบอร์ดได้เสมอ ต่อเพิ่ม แก้ไข ขาย หรือรับสต็อกไม่ได้ ถ้าจะต้องอายุ",
    statusHeading: "สถานะสมาชิก",
    statusRows: [
      ["แพ็กเกจ", "รายปี (Basic)"],
      ["สถานะ", "active"],
      ["วันหมดอายุ", "12 มี.ค. 2570 (เหลือ 207 วัน)"],
      ["สิทธิ์สร้างร้าน", "2 / 3 ร้าน"],
      ["สิทธิ์ที่ซื้อเพิ่ม", "0 ร้าน"],
    ],
    activeLabel: "กำลังใช้งาน",
    renewBtn: "ต่ออายุตอนนี้ →",
    buyExtraHeading: "เพิ่มโควต้าด้วยการอัปเกรดแพ็กเกจ",
    buyExtraSub: "ระบบไม่มีการซื้อโควต้าแยก แพ็กเกจที่สูงขึ้นจะเพิ่มสิทธิ์ร้านค้า สินค้า และพนักงานตามแผน",
    qtyLabel: "เลือกแพ็กเกจที่ต้องการ",
    payBtn: "ดูแพ็กเกจ →",
    historyHeading: "ประวัติการชำระเงิน",
    columns: ["วันที่", "รายการ", "จำนวน", "ยอด", "สถานะ"],
    paidLabel: "ชำระแล้ว",
    payHistory: [
      { date: "15 ส.ค. 2569", item: "ซื้อสิทธิ์ร้านเพิ่ม", qty: 1, amount: "฿590.00" },
      { date: "12 มี.ค. 2569", item: "สมัครแพ็กเกจรายปี (Basic)", qty: 1, amount: "฿1,990.00" },
    ],
  },
  en: {
    title: "Membership & Billing",
    bannerBody:
      "As you approach the expiry date, this is only a heads-up — you can always view data, stock, history, and the dashboard. Adding, editing, selling, or restocking is blocked once it actually expires.",
    statusHeading: "Membership Status",
    statusRows: [
      ["Plan", "Annual (Basic)"],
      ["Status", "active"],
      ["Expires", "Mar 12, 2027 (207 days left)"],
      ["Shop Slots", "2 / 3 shops"],
      ["Extra Slots Purchased", "0 shops"],
    ],
    activeLabel: "Active",
    renewBtn: "Renew Now →",
    buyExtraHeading: "Increase Quota with a Plan Upgrade",
    buyExtraSub: "There are no separate quota add-ons. Upgrade your plan to increase shop, product, and staff limits.",
    qtyLabel: "Choose a plan",
    payBtn: "View Plans →",
    historyHeading: "Payment History",
    columns: ["Date", "Item", "Qty", "Amount", "Status"],
    paidLabel: "Paid",
    payHistory: [
      { date: "Aug 15, 2026", item: "Bought extra shop slot", qty: 1, amount: "฿590.00" },
      { date: "Mar 12, 2026", item: "Subscribed to Annual Plan (Basic)", qty: 1, amount: "฿1,990.00" },
    ],
  },
};

export default function MembershipPage() {
  const { locale } = useLocale();
  const t = content[locale];
  const subscriptionQuery = useMySubscription();
  const paymentsQuery = usePayments();
  const subscription = subscriptionQuery.data;
  const statusRows = subscription
    ? [
        [locale === "th" ? "แพ็กเกจ" : "Plan", subscription.subscription.plan.nameTh],
        [locale === "th" ? "สถานะ" : "Status", subscription.subscription.status],
        [
          locale === "th" ? "วันหมดอายุ" : "Expires",
          subscription.subscription.expiresAt
            ? new Date(subscription.subscription.expiresAt).toLocaleDateString(locale === "th" ? "th-TH" : "en-US")
            : locale === "th" ? "ไม่มีวันหมดอายุ" : "No expiry",
        ],
        [locale === "th" ? "สิทธิ์สร้างร้าน" : "Shop Slots", `${subscription.quotas.shop.used} / ${subscription.quotas.shop.allowed}`],
        [locale === "th" ? "สินค้า" : "Products", `${subscription.quotas.product.used} / ${subscription.quotas.product.allowed ?? "∞"}`],
      ]
    : t.statusRows;

  return (
    <>
      <TopBar title={t.title} user={roleAvatar.owner[locale]} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="flex flex-col gap-5">
          <Alert variant="info">
            <AlertDescription className="text-foreground/80">
              {t.bannerBody}
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <div className="px-4">
                <div className="mb-3 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                  {t.statusHeading}
                </div>
                {statusRows.map(([label, value], i) => (
                  <div
                    key={label}
                    className={`flex items-center justify-between py-2.75 ${
                      i < t.statusRows.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <span className="text-[13px] text-muted-foreground">
                      {label}
                    </span>
                    {label === (locale === "th" ? "สถานะ" : "Status") ? (
                      <Badge variant="success">{t.activeLabel}</Badge>
                    ) : (
                      <span className="text-sm font-semibold">{value}</span>
                    )}
                  </div>
                ))}
                <div className="mt-4">
                  <Button variant="gradient">{t.renewBtn}</Button>
                </div>
              </div>
            </Card>

            <Card>
              <div className="px-4">
                <div className="mb-1 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                  {t.buyExtraHeading}
                </div>
                <p className="mb-4 text-[13px] text-muted-foreground">
                  {t.buyExtraSub}
                </p>
                <div className="mb-3.5 text-[13px] text-muted-foreground">{t.qtyLabel}</div>
                <Button variant="dark" render={<Link href="/membership/upgrade" />}>{t.payBtn}</Button>
              </div>
            </Card>
          </div>

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
                        className={`px-5 py-3 text-xs font-medium text-muted-foreground uppercase ${
                          i === 2 || i === 3 ? "text-right" : "text-left"
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(paymentsQuery.data ?? []).map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-5 py-3.5 font-mono text-[13px] text-muted-foreground">{new Date(row.createdAt).toLocaleDateString(locale === "th" ? "th-TH" : "en-US")}</td>
                      <td className="px-5 py-3.5">{row.subscription?.plan?.nameTh ?? row.purpose}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-[13px]">1</td>
                      <td className="px-5 py-3.5 text-right font-mono text-[13px] font-semibold">฿{Number(row.amountThb).toLocaleString()}</td>
                      <td className="px-5 py-3.5"><Badge variant="success">{t.paidLabel}</Badge></td>
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

"use client";

import TopBar from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
    buyExtraHeading: "ซื้อสิทธิ์ร้านเพิ่ม",
    buyExtraSub: "ซื้อเพิ่มได้ทุกจำนวนร้าน สิทธิ์สะสมหมดอายุตามรอบบิล",
    qtyLabel: "จำนวนร้านที่ต้องการเพิ่ม",
    payBtn: "ชำระเงิน →",
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
    buyExtraHeading: "Buy Extra Shop Slots",
    buyExtraSub: "Buy any quantity of extra slots; purchased slots expire with your billing cycle.",
    qtyLabel: "Number of Extra Shops",
    payBtn: "Pay →",
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
                {t.statusRows.map(([label, value], i) => (
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
                <div className="mb-3.5">
                  <div className="mb-1.5 text-[11px] font-semibold tracking-[0.08em] text-foreground uppercase">
                    {t.qtyLabel}
                  </div>
                  <Select defaultValue="1">
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 — ฿590</SelectItem>
                      <SelectItem value="2">2 — ฿1,080</SelectItem>
                      <SelectItem value="3">3 — ฿1,590</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="dark">{t.payBtn}</Button>
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
                  {t.payHistory.map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-5 py-3.5 font-mono text-[13px] text-muted-foreground">{row.date}</td>
                      <td className="px-5 py-3.5">{row.item}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-[13px]">{row.qty}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-[13px] font-semibold">{row.amount}</td>
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

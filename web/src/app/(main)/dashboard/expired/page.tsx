"use client";

import { useState } from "react";

import TopBar from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";

const content = {
  th: {
    title: "แดชบอร์ด",
    bannerTitle: "แพ็กเกจหมดอายุแล้ว — ร้านค้าของคุณอยู่ในโหมดอ่านอย่างเดียว",
    bannerBody:
      "ดูข้อมูล สต็อก ประวัติ และแดชบอร์ดได้ตามปกติ แต่เพิ่ม แก้ไข ขาย หรือรับสต็อกไม่ได้ จนกว่าจะต่ออายุ",
    renewBtn: "ต่ออายุตอนนี้ →",
    periods: { day: "รายวัน", week: "รายสัปดาห์", month: "รายเดือน" },
    stats: [
      { label: "ยอดขายวันนี้", value: "฿4,280", iconBg: "#FEF3DC", icon: "💰" },
      { label: "จำนวนบิล", value: "63", iconBg: "#E8F5E7", icon: "🧾" },
      { label: "สินค้าใกล้หมด", value: "7", iconBg: "#FDEAE8", icon: "⚠️" },
      { label: "ค้างสต็อก 30 วัน+", value: "12", iconBg: "#FEF3DC", icon: "📦" },
    ],
    topSellersTitle: "สินค้าขายดี (7 วัน)",
    colProduct: "สินค้า",
    colSold: "ขายได้",
    colRevenue: "รายได้",
    topItems: [
      { name: "โค้กกระป๋อง 325 มล.", qty: 142, revenue: "฿2,130" },
      { name: "มามาห่มูสับ", qty: 98, revenue: "฿686" },
      { name: "ลูกอมฮอลล์ เมนทอล", qty: 64, revenue: "฿1,408" },
      { name: "น้ำดื่มตราสิงห์ 600 มล.", qty: 60, revenue: "฿600" },
    ],
  },
  en: {
    title: "Dashboard",
    bannerTitle: "Plan expired — your shop is in read-only mode",
    bannerBody:
      "You can still view data, stock, history, and the dashboard as usual, but adding, editing, selling, or restocking is disabled until you renew.",
    renewBtn: "Renew Now →",
    periods: { day: "Daily", week: "Weekly", month: "Monthly" },
    stats: [
      { label: "Today's Sales", value: "฿4,280", iconBg: "#FEF3DC", icon: "💰" },
      { label: "Bill Count", value: "63", iconBg: "#E8F5E7", icon: "🧾" },
      { label: "Low Stock Items", value: "7", iconBg: "#FDEAE8", icon: "⚠️" },
      { label: "Stagnant 30+ Days", value: "12", iconBg: "#FEF3DC", icon: "📦" },
    ],
    topSellersTitle: "Best Sellers (7 Days)",
    colProduct: "Product",
    colSold: "Sold",
    colRevenue: "Revenue",
    topItems: [
      { name: "Coke Can 325 ml.", qty: 142, revenue: "฿2,130" },
      { name: "Mama Pork Noodles", qty: 98, revenue: "฿686" },
      { name: "Hall's Mentho-Lyptus", qty: 64, revenue: "฿1,408" },
      { name: "Singha Water 600 ml.", qty: 60, revenue: "฿600" },
    ],
  },
};

export default function ExpiredDashboardPage() {
  const { locale } = useLocale();
  const t = content[locale];
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");

  return (
    <>
      <TopBar title={t.title} readOnly user={roleAvatar.expired[locale]} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="flex flex-col gap-5">
          <Alert variant="destructive">
            <AlertDescription>
              <span className="font-bold text-destructive">{t.bannerTitle}</span>
              <br />
              {t.bannerBody}
            </AlertDescription>
          </Alert>
          <div className="flex justify-end">
            <Button variant="gradient">{t.renewBtn}</Button>
          </div>

          <div className="inline-flex w-fit gap-0.5 rounded-full bg-secondary p-1">
            {(["day", "week", "month"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-full px-4 py-1.5 text-[13px] transition-all ${
                  p === period
                    ? "bg-background font-semibold text-foreground shadow-[0_1px_4px_rgba(0,0,0,0.1)]"
                    : "font-normal text-muted-foreground"
                }`}
              >
                {t.periods[p]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.stats.map((s) => (
              <Card key={s.label}>
                <div className="px-4">
                  <div
                    className="mb-3.5 flex size-12 items-center justify-center rounded-full text-xl"
                    style={{ backgroundColor: s.iconBg }}
                  >
                    {s.icon}
                  </div>
                  <div className="font-mono text-2xl font-bold tracking-[-0.02em] text-foreground">
                    {s.value}
                  </div>
                  <div className="mt-1 text-[13px] text-muted-foreground">
                    {s.label}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <div className="px-4">
              <div className="mb-4 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                {t.topSellersTitle}
              </div>
              <div className="overflow-x-auto">
              <table className="w-full min-w-100 border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-1.5 text-left font-medium text-muted-foreground">
                      {t.colProduct}
                    </th>
                    <th className="py-1.5 text-right font-medium text-muted-foreground">
                      {t.colSold}
                    </th>
                    <th className="py-1.5 text-right font-medium text-muted-foreground">
                      {t.colRevenue}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {t.topItems.map((item) => (
                    <tr key={item.name} className="border-b border-border">
                      <td className="py-2.5">{item.name}</td>
                      <td className="py-2.5 text-right font-mono">{item.qty}</td>
                      <td className="py-2.5 text-right font-mono">
                        {item.revenue}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}

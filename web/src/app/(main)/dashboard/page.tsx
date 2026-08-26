"use client";

import { useState } from "react";

import TopBar from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";
import {
  useBestSellers,
  useShops,
  useShopDashboard,
} from "@/lib/hooks/use-inventory";

const content = {
  th: {
    title: "แดชบอร์ด",
    allShops: "ทุกร้าน",
    shopA: "อุ้มมินิมาร์ท สาขาลาดพร้าว",
    shopB: "อุ้มมินิมาร์ท สาขาบางนา",
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
    aiTitle: "คำแนะนำจาก AI",
    aiTips: [] as { tag: string; text: string }[],
  },
  en: {
    title: "Dashboard",
    allShops: "All Shops",
    shopA: "Aum Minimart — Lat Phrao",
    shopB: "Aum Minimart — Bang Na",
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
    aiTitle: "AI Recommendations",
    aiTips: [] as { tag: string; text: string }[],
  },
};

export default function DashboardPage() {
  const { locale } = useLocale();
  const t = content[locale];
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [selectedShopId, setSelectedShopId] = useState("");
  const shopsQuery = useShops();
  const shopId = selectedShopId || shopsQuery.data?.[0]?.id;
  const dashboardQuery = useShopDashboard(shopId);
  const bestSellersQuery = useBestSellers(shopId);
  const dashboard = dashboardQuery.data;
  const stats = t.stats.map((stat, index) => ({
    ...stat,
    value: dashboard
      ? [
          `฿${dashboard.sales.totalAmount.toLocaleString()}`,
          dashboard.sales.saleCount.toLocaleString(),
          dashboard.stock.lowStock.toLocaleString(),
          dashboard.stock.outOfStock.toLocaleString(),
        ][index]
      : "—",
  }));
  const topItems = bestSellersQuery.data?.items ?? [];

  return (
    <>
      <TopBar title={t.title} user={roleAvatar.owner[locale]} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <Select value={shopId ?? ""} onValueChange={(value) => setSelectedShopId(value ?? "")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {shopsQuery.data?.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id}>
                    {shop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="inline-flex gap-0.5 rounded-full bg-secondary p-1">
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
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
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

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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
                    {topItems.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-muted-foreground">
                          {bestSellersQuery.isLoading ? "กำลังโหลดข้อมูล…" : "ยังไม่มีข้อมูลยอดขาย"}
                        </td>
                      </tr>
                    )}
                    {topItems.map((item) => (
                      <tr key={item.shopProductId} className="border-b border-border">
                        <td className="py-2.5">{item.productName}</td>
                        <td className="py-2.5 text-right font-mono">{item.quantitySold}</td>
                        <td className="py-2.5 text-right font-mono">
                          ฿{item.totalAmount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </Card>

            <div className="rounded-3xl bg-brand-dark p-6">
              <div className="mb-4 font-heading text-xs font-bold tracking-[0.12em] text-primary uppercase">
                {t.aiTitle}
              </div>
              <div className="flex flex-col gap-3.5">
                {t.aiTips.map((tip, i) => (
                  <div
                    key={i}
                    className={
                      i < t.aiTips.length - 1 ? "border-b border-white/10 pb-3.5" : ""
                    }
                  >
                    <span
                      className={`mb-1.5 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-widest text-white ${
                        tip.tag === "RESTOCK" ? "bg-primary" : "bg-status-green"
                      }`}
                    >
                      {tip.tag}
                    </span>
                    <p className="text-[13px] leading-relaxed text-white/70">
                      {tip.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

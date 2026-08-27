"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";

import { useQuery } from "@tanstack/react-query";

import TopBar from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useSelectedShop } from "@/components/shared/SelectedShopContext";
import { ApiError, api, withQuery } from "@/lib/api-client";
import { useShops } from "@/lib/hooks/use-inventory";

/**
 * ทุก query ในหน้านี้ใช้ "ช่วงเวลาเดียวกัน" ที่มาจากปุ่ม รายวัน/รายสัปดาห์/รายเดือน
 * ตัวเลขบนการ์ด กราฟ และตารางจึงพูดถึงช่วงเดียวกันเสมอ
 *
 * api จำกัดช่วงไว้ที่ 365 วัน (dashboard.dto.ts) — ค่าตรงนี้ห้ามเกินนั้น
 */
const DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_DAYS = { day: 30, week: 84, month: 365 } as const;
const DEAD_STOCK_DAYS = 30;

type Period = keyof typeof RANGE_DAYS;

interface ShopOverview {
  range: { from: string; to: string };
  sales: { totalAmount: number; saleCount: number; averageSaleAmount: number };
  stock: { activeProducts: number; lowStock: number; outOfStock: number };
  generatedAt: string;
}

interface TrendPoint {
  period: string;
  totalAmount: number;
  saleCount: number;
}

interface SalesTrend {
  range: { from: string; to: string };
  groupBy: Period;
  points: TrendPoint[];
}

interface BestSeller {
  rank: number;
  shopProductId: string;
  productName: string;
  quantitySold: number;
  totalAmount: number;
}

interface CategoryShare {
  categoryId: string | null;
  categoryName: string | null;
  totalAmount: number;
  quantitySold: number;
  shareOfTotal: number;
}

interface DeadStockItem {
  shopProductId: string;
  productName: string;
  stockQty: number;
  lastSoldAt: string | null;
  daysSinceLastSale: number | null;
}

const content = {
  th: {
    title: "แดชบอร์ด",
    pickShop: "เลือกร้าน",
    periods: { day: "รายวัน", week: "รายสัปดาห์", month: "รายเดือน" },
    rangeLabel: { day: "30 วันล่าสุด", week: "12 สัปดาห์ล่าสุด", month: "12 เดือนล่าสุด" },
    noShopTitle: "ยังไม่มีร้าน",
    noShopBody: "สร้างร้านก่อน แล้วแดชบอร์ดจะเริ่มเก็บตัวเลขให้อัตโนมัติ",
    noShopCta: "ไปสร้างร้าน",
    statSales: "ยอดขาย",
    statBills: "จำนวนบิล",
    statAverage: "เฉลี่ยต่อบิล",
    statLowStock: "สินค้าใกล้หมด",
    trendTitle: "แนวโน้มยอดขาย",
    trendTotal: "รวมทั้งช่วง",
    trendEmpty: "ยังไม่มีบิลขายในช่วงนี้",
    bills: "บิล",
    topSellersTitle: "สินค้าขายดี",
    colProduct: "สินค้า",
    colSold: "ขายได้",
    colRevenue: "รายได้",
    categoryTitle: "ยอดขายตามหมวดหมู่",
    categoryNone: "ไม่ระบุหมวดหมู่",
    deadStockTitle: `สินค้าค้างสต็อก ${DEAD_STOCK_DAYS} วัน+`,
    colStock: "คงเหลือ",
    colLastSold: "ขายล่าสุด",
    neverSold: "ไม่เคยขาย",
    daysAgo: "วันก่อน",
    stockTitle: "สถานะสต็อก",
    stockActive: "สินค้าที่ขายอยู่",
    stockLow: "ใกล้หมด",
    stockOut: "หมดสต็อก",
    loading: "กำลังโหลดข้อมูล…",
    empty: "ยังไม่มีข้อมูล",
    lockedCta: "อัปเกรดแพ็กเกจ",
    deniedTitle: "คุณยังไม่มีสิทธิ์ดูแดชบอร์ด",
    deniedBody:
      "เจ้าของร้านเป็นคนเปิดสิทธิ์นี้ให้ ลองติดต่อเจ้าของร้านเพื่อขอเปิด “ดูแดชบอร์ด” ระหว่างนี้ดูประวัติสต็อกของร้านที่คุณประจำอยู่ได้ตามปกติ",
    deniedCta: "ไปดูประวัติสต็อก",
  },
  en: {
    title: "Dashboard",
    pickShop: "Select a shop",
    periods: { day: "Daily", week: "Weekly", month: "Monthly" },
    rangeLabel: { day: "Last 30 days", week: "Last 12 weeks", month: "Last 12 months" },
    noShopTitle: "No shop yet",
    noShopBody: "Create a shop first — the dashboard starts collecting numbers automatically.",
    noShopCta: "Create a shop",
    statSales: "Sales",
    statBills: "Bills",
    statAverage: "Average per bill",
    statLowStock: "Low stock",
    trendTitle: "Sales trend",
    trendTotal: "Range total",
    trendEmpty: "No sales in this range yet",
    bills: "bills",
    topSellersTitle: "Best sellers",
    colProduct: "Product",
    colSold: "Sold",
    colRevenue: "Revenue",
    categoryTitle: "Sales by category",
    categoryNone: "Uncategorised",
    deadStockTitle: `Dead stock ${DEAD_STOCK_DAYS}+ days`,
    colStock: "In stock",
    colLastSold: "Last sold",
    neverSold: "Never sold",
    daysAgo: "days ago",
    stockTitle: "Stock status",
    stockActive: "Active products",
    stockLow: "Low stock",
    stockOut: "Out of stock",
    loading: "Loading…",
    empty: "No data yet",
    lockedCta: "Upgrade plan",
    deniedTitle: "You do not have dashboard access",
    deniedBody:
      "Only the shop owner can grant this. Ask them to turn on “View dashboard” for you. In the meantime you can still browse the stock history of the shops you are assigned to.",
    deniedCta: "View stock history",
  },
};

function baht(value: number, locale: string) {
  return `฿${value.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    maximumFractionDigits: 0,
  })}`;
}

/** วันที่จาก api เป็น YYYY-MM-DD (วัน/สัปดาห์) หรือ YYYY-MM (เดือน) */
function shortPeriod(key: string, groupBy: Period) {
  const [year, month, day] = key.split("-");
  if (groupBy === "month") return `${month}/${year.slice(2)}`;
  return `${day}/${month}`;
}

/** api ตอบ code นี้เมื่อเจ้าของร้านไม่ได้ติ๊ก canViewDashboard ให้พนักงานคนนี้ */
const DASHBOARD_DENIED = "DASHBOARD_PERMISSION_DENIED";

/**
 * 403 จากเส้นรายงาน = แพ็กเกจไม่ถึง (PLAN_UPGRADE_REQUIRED)
 *
 * ยกเว้น DASHBOARD_PERMISSION_DENIED ที่เป็น 403 เหมือนกันแต่คนละเรื่อง —
 * ถ้าไม่แยก พนักงานที่เจ้าของร้านยังไม่เปิดสิทธิ์ให้ จะเห็นปุ่ม "อัปเกรดแพ็กเกจ"
 * ทั้งที่พนักงานอัปเกรดแทนเจ้าของร้านไม่ได้ (SRS §126) เช็ค code ไม่ใช่แค่ status
 *
 * จงใจไม่ประกาศเป็น type predicate (`error is ApiError`) เพราะ `!planLocked(e)`
 * จะทำให้ TS ตัด ApiError ออกจนเหลือ never แล้วอ่าน .message ไม่ได้
 */
function planLocked(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 403 &&
    error.code !== DASHBOARD_DENIED
  );
}

function dashboardDenied(error: unknown): boolean {
  return error instanceof ApiError && error.code === DASHBOARD_DENIED;
}

function SectionCard({
  title,
  aside,
  children,
  className,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-4">
        <div className="font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
          {title}
        </div>
        {aside}
      </div>
      <div className="px-4">{children}</div>
    </Card>
  );
}

/** การ์ดที่ถูกล็อกด้วยแพ็กเกจ — แสดงเหตุผลจริงจาก api แทนคำว่า "ไม่มีข้อมูล" */
function LockedNotice({ message, cta }: { message: string; cta: string }) {
  return (
    <div className="flex flex-col items-start gap-3 py-6">
      <p className="text-sm text-muted-foreground">{message}</p>
      <Link
        href="/membership"
        className="rounded-full bg-primary px-4 py-1.5 text-[13px] font-semibold text-primary-foreground"
      >
        {cta}
      </Link>
    </div>
  );
}

function StateLine({ label }: { label: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{label}</p>;
}

export default function DashboardPage() {
  const { locale } = useLocale();
  const t = content[locale];
  const [period, setPeriod] = useState<Period>("day");

  const shopsQuery = useShops();
  const shops = useMemo(() => shopsQuery.data ?? [], [shopsQuery.data]);
  const { selectedShopId, setSelectedShopId } = useSelectedShop();

  // ร้านที่เลือกไว้อาจถูกลบไปแล้ว — ถอยไปร้านแรกเสมอ
  const shopId =
    (selectedShopId && shops.some((shop) => shop.id === selectedShopId)
      ? selectedShopId
      : shops[0]?.id) ?? "";
  const hasShop = shopId !== "";
  const currentShopName =
    shops.find((shop) => shop.id === shopId)?.name ?? t.pickShop;

  // useMemo กัน new Date() สร้างใหม่ทุก render ซึ่งจะทำให้ queryKey เปลี่ยนไม่หยุด
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - RANGE_DAYS[period] * DAY_MS);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [period]);

  const base = `/api/backend/shops/${shopId}/dashboard`;
  const shared = { enabled: hasShop, retry: false } as const;

  const overviewQuery = useQuery<ShopOverview, ApiError>({
    ...shared,
    queryKey: ["dashboard", "overview", shopId, range],
    queryFn: () => api.get<ShopOverview>(withQuery(base, range)),
  });

  const trendQuery = useQuery<SalesTrend, ApiError>({
    ...shared,
    queryKey: ["dashboard", "trend", shopId, range, period],
    queryFn: () =>
      api.get<SalesTrend>(
        withQuery(`${base}/reports/sales-trend`, { ...range, groupBy: period }),
      ),
  });

  const bestSellersQuery = useQuery<{ items: BestSeller[] }, ApiError>({
    ...shared,
    queryKey: ["dashboard", "best-sellers", shopId, range],
    queryFn: () =>
      api.get<{ items: BestSeller[] }>(
        withQuery(`${base}/best-sellers`, { ...range, limit: 5 }),
      ),
  });

  const categoryQuery = useQuery<
    { totalAmount: number; categories: CategoryShare[] },
    ApiError
  >({
    ...shared,
    queryKey: ["dashboard", "by-category", shopId, range],
    queryFn: () =>
      api.get<{ totalAmount: number; categories: CategoryShare[] }>(
        withQuery(`${base}/reports/by-category`, range),
      ),
  });

  // ค้างสต็อกนับจาก "วันนี้ย้อนหลัง N วัน" ตามนิยามของ api ไม่ผูกกับช่วงด้านบน
  const deadStockQuery = useQuery<{ days: number; items: DeadStockItem[] }, ApiError>({
    ...shared,
    queryKey: ["dashboard", "dead-stock", shopId],
    queryFn: () =>
      api.get<{ days: number; items: DeadStockItem[] }>(
        withQuery(`${base}/dead-stock`, { days: DEAD_STOCK_DAYS }),
      ),
  });

  const overview = overviewQuery.data;
  const points = trendQuery.data?.points ?? [];
  const peak = points.reduce((max, point) => Math.max(max, point.totalAmount), 0);
  const rangeTotal = points.reduce((sum, point) => sum + point.totalAmount, 0);

  const stats = [
    {
      key: "sales",
      label: `${t.statSales} · ${t.rangeLabel[period]}`,
      value: overview ? baht(overview.sales.totalAmount, locale) : "—",
      icon: "💰",
      iconBg: "#FEF3DC",
    },
    {
      key: "bills",
      label: t.statBills,
      value: overview ? overview.sales.saleCount.toLocaleString() : "—",
      icon: "🧾",
      iconBg: "#E8F5E7",
    },
    {
      key: "average",
      label: t.statAverage,
      value: overview ? baht(overview.sales.averageSaleAmount, locale) : "—",
      icon: "📈",
      iconBg: "#E8F5E7",
    },
    {
      key: "low",
      label: t.statLowStock,
      value: overview ? overview.stock.lowStock.toLocaleString() : "—",
      icon: "⚠️",
      iconBg: "#FDEAE8",
    },
  ];

  /**
   * พนักงานที่เจ้าของร้านยังไม่เปิด canViewDashboard ให้ — จงใจไม่ redirect ออก
   *
   * ทุกหน้าฝั่งพนักงานมีสิทธิ์ของตัวเองคุมอยู่ (/products ใช้ canManageProduct,
   * /pos ใช้ canScanSale, /chatbot ใช้ canUseChatbot) ถ้าเด้งไปหน้าใดหน้าหนึ่ง
   * แล้วหน้านั้นก็ไม่มีสิทธิ์อีก จะกลายเป็นเด้งวนไม่จบ อยู่หน้าเดิมแล้วบอกเหตุผล
   * ตรงนี้ชัดกว่า
   *
   * ลิงก์ออกไป /stock-history เพราะเป็นหน้า "ทำงานได้จริง" หน้าเดียวที่พนักงาน
   * ทุกคนเปิดได้เสมอ — assertCanViewStock() ขอแค่ถูก assign เข้าร้านที่ยัง
   * active ไม่ได้เช็ค staff_permissions เลย (prisma-stock-authorization.adapter.ts)
   */
  if (dashboardDenied(overviewQuery.error)) {
    return (
      <>
        <TopBar title={t.title} />
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
          <Card variant="dashed">
            <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
              <div className="font-heading text-base font-semibold">
                {t.deniedTitle}
              </div>
              <p className="max-w-md text-sm text-muted-foreground">
                {t.deniedBody}
              </p>
              <Link
                href="/stock-history"
                className="rounded-full bg-primary px-4 py-1.5 text-[13px] font-semibold text-primary-foreground"
              >
                {t.deniedCta}
              </Link>
            </div>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title={t.title} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={shopId}
              onValueChange={(value) => {
                if (value) setSelectedShopId(String(value));
              }}
              disabled={shops.length === 0}
            >
              {/*
                Base UI ให้ <Select.Value /> แสดง "ค่า" ที่เลือก ไม่ใช่ข้อความใน
                <SelectItem> เหมือน Radix — ถ้าใช้ตรงๆ จะได้ UUID ของร้านโผล่มา
                จึงเรนเดอร์ชื่อร้านเองตรงนี้
              */}
              <SelectTrigger className="min-w-52">
                <span className="flex-1 truncate text-left">{currentShopName}</span>
              </SelectTrigger>
              <SelectContent>
                {shops.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id}>
                    {shop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="inline-flex gap-0.5 rounded-full bg-secondary p-1">
              {(Object.keys(RANGE_DAYS) as Period[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPeriod(option)}
                  aria-pressed={option === period}
                  className={`rounded-full px-4 py-1.5 text-[13px] transition-all ${
                    option === period
                      ? "bg-background font-semibold text-foreground shadow-[0_1px_4px_rgba(0,0,0,0.1)]"
                      : "font-normal text-muted-foreground"
                  }`}
                >
                  {t.periods[option]}
                </button>
              ))}
            </div>
          </div>

          {!hasShop && !shopsQuery.isLoading ? (
            <Card variant="dashed">
              <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
                <div className="font-heading text-base font-semibold">
                  {t.noShopTitle}
                </div>
                <p className="max-w-sm text-sm text-muted-foreground">
                  {t.noShopBody}
                </p>
                <Link
                  href="/shops"
                  className="rounded-full bg-primary px-4 py-1.5 text-[13px] font-semibold text-primary-foreground"
                >
                  {t.noShopCta}
                </Link>
              </div>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                  <Card key={stat.key}>
                    <div className="px-4">
                      <div
                        className="mb-3.5 flex size-12 items-center justify-center rounded-full text-xl"
                        style={{ backgroundColor: stat.iconBg }}
                      >
                        {stat.icon}
                      </div>
                      <div className="font-mono text-2xl font-bold tracking-[-0.02em] text-foreground">
                        {stat.value}
                      </div>
                      <div className="mt-1 text-[13px] text-muted-foreground">
                        {stat.label}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* กราฟแนวโน้ม — วางบนพื้นเข้มเพราะสีส้มแบรนด์บนพื้นครีมคอนทราสต์ไม่ผ่าน */}
              <Card className="bg-brand-dark text-white">
                <div className="flex flex-wrap items-baseline justify-between gap-2 px-4">
                  <div className="font-heading text-xs font-bold tracking-[0.12em] text-primary uppercase">
                    {t.trendTitle} · {t.rangeLabel[period]}
                  </div>
                  {!trendQuery.isError && points.length > 0 && (
                    <div className="text-[13px] text-white/60">
                      {t.trendTotal}{" "}
                      <span className="font-mono font-semibold text-white">
                        {baht(rangeTotal, locale)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="px-4">
                  {trendQuery.isLoading && (
                    <p className="py-10 text-center text-sm text-white/50">
                      {t.loading}
                    </p>
                  )}

                  {planLocked(trendQuery.error) && (
                    <div className="flex flex-col items-start gap-3 py-6">
                      <p className="text-sm text-white/70">
                        {trendQuery.error?.message}
                      </p>
                      <Link
                        href="/membership"
                        className="rounded-full bg-primary px-4 py-1.5 text-[13px] font-semibold text-primary-foreground"
                      >
                        {t.lockedCta}
                      </Link>
                    </div>
                  )}

                  {trendQuery.isError && !planLocked(trendQuery.error) && (
                    <p className="py-10 text-center text-sm text-destructive">
                      {trendQuery.error?.message}
                    </p>
                  )}

                  {trendQuery.isSuccess && peak === 0 && (
                    <p className="py-10 text-center text-sm text-white/50">
                      {t.trendEmpty}
                    </p>
                  )}

                  {trendQuery.isSuccess && peak > 0 && (
                    <>
                      <div className="flex h-44 items-end gap-[2px]" role="presentation">
                        {points.map((point) => {
                          const height = (point.totalAmount / peak) * 100;
                          return (
                            <div
                              key={point.period}
                              className="group relative flex h-full flex-1 items-end"
                            >
                              <div
                                className="w-full rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-80"
                                style={{
                                  height: `${height}%`,
                                  minHeight: point.totalAmount > 0 ? 2 : 0,
                                }}
                              />
                              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-lg bg-white px-2.5 py-1.5 text-center whitespace-nowrap text-brand-dark shadow-md group-hover:block">
                                <div className="font-mono text-[13px] font-semibold">
                                  {baht(point.totalAmount, locale)}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  {shortPeriod(point.period, period)} ·{" "}
                                  {point.saleCount} {t.bills}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-2 flex justify-between text-[11px] text-white/40">
                        <span>{shortPeriod(points[0].period, period)}</span>
                        {points.length > 2 && (
                          <span>
                            {shortPeriod(
                              points[Math.floor(points.length / 2)].period,
                              period,
                            )}
                          </span>
                        )}
                        <span>
                          {shortPeriod(points[points.length - 1].period, period)}
                        </span>
                      </div>

                      {/* ทางเลือกอ่านค่าแบบไม่ต้องพึ่งกราฟ สำหรับ screen reader */}
                      <table className="sr-only">
                        <caption>{t.trendTitle}</caption>
                        <tbody>
                          {points.map((point) => (
                            <tr key={point.period}>
                              <th scope="row">{point.period}</th>
                              <td>{point.totalAmount}</td>
                              <td>
                                {point.saleCount} {t.bills}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              </Card>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <SectionCard title={`${t.topSellersTitle} · ${t.rangeLabel[period]}`}>
                  {planLocked(bestSellersQuery.error) ? (
                    <LockedNotice
                      message={bestSellersQuery.error?.message ?? ""}
                      cta={t.lockedCta}
                    />
                  ) : bestSellersQuery.isLoading ? (
                    <StateLine label={t.loading} />
                  ) : bestSellersQuery.isError ? (
                    <p className="py-8 text-center text-sm text-destructive">
                      {bestSellersQuery.error?.message}
                    </p>
                  ) : (bestSellersQuery.data?.items.length ?? 0) === 0 ? (
                    <StateLine label={t.trendEmpty} />
                  ) : (
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
                          {bestSellersQuery.data?.items.map((item) => (
                            <tr
                              key={item.shopProductId}
                              className="border-b border-border last:border-0"
                            >
                              <td className="py-2.5">
                                <span className="mr-2 text-muted-foreground">
                                  {item.rank}.
                                </span>
                                {item.productName}
                              </td>
                              <td className="py-2.5 text-right font-mono">
                                {item.quantitySold}
                              </td>
                              <td className="py-2.5 text-right font-mono">
                                {baht(item.totalAmount, locale)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SectionCard>

                <SectionCard title={t.categoryTitle}>
                  {planLocked(categoryQuery.error) ? (
                    <LockedNotice
                      message={categoryQuery.error?.message ?? ""}
                      cta={t.lockedCta}
                    />
                  ) : categoryQuery.isLoading ? (
                    <StateLine label={t.loading} />
                  ) : categoryQuery.isError ? (
                    <p className="py-8 text-center text-sm text-destructive">
                      {categoryQuery.error?.message}
                    </p>
                  ) : (categoryQuery.data?.categories.length ?? 0) === 0 ? (
                    <StateLine label={t.trendEmpty} />
                  ) : (
                    <div className="flex flex-col gap-3 py-1">
                      {categoryQuery.data?.categories.map((row) => (
                        <div key={row.categoryId ?? "none"}>
                          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
                            <span className="truncate">
                              {row.categoryName ?? t.categoryNone}
                            </span>
                            <span className="shrink-0 font-mono text-muted-foreground">
                              {baht(row.totalAmount, locale)} ·{" "}
                              {Math.round(row.shareOfTotal * 100)}%
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-foreground/80"
                              style={{
                                width: `${Math.max(row.shareOfTotal * 100, 1)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
                <SectionCard title={t.deadStockTitle}>
                  {planLocked(deadStockQuery.error) ? (
                    <LockedNotice
                      message={deadStockQuery.error?.message ?? ""}
                      cta={t.lockedCta}
                    />
                  ) : deadStockQuery.isLoading ? (
                    <StateLine label={t.loading} />
                  ) : deadStockQuery.isError ? (
                    <p className="py-8 text-center text-sm text-destructive">
                      {deadStockQuery.error?.message}
                    </p>
                  ) : (deadStockQuery.data?.items.length ?? 0) === 0 ? (
                    <StateLine label={t.empty} />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-100 border-collapse text-[13px]">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="py-1.5 text-left font-medium text-muted-foreground">
                              {t.colProduct}
                            </th>
                            <th className="py-1.5 text-right font-medium text-muted-foreground">
                              {t.colStock}
                            </th>
                            <th className="py-1.5 text-right font-medium text-muted-foreground">
                              {t.colLastSold}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {deadStockQuery.data?.items.slice(0, 8).map((item) => (
                            <tr
                              key={item.shopProductId}
                              className="border-b border-border last:border-0"
                            >
                              <td className="py-2.5">{item.productName}</td>
                              <td className="py-2.5 text-right font-mono">
                                {item.stockQty}
                              </td>
                              <td className="py-2.5 text-right font-mono">
                                {item.daysSinceLastSale === null
                                  ? t.neverSold
                                  : `${item.daysSinceLastSale} ${t.daysAgo}`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SectionCard>

                <SectionCard title={t.stockTitle}>
                  <div className="flex flex-col gap-3 py-1">
                    {[
                      {
                        key: "active",
                        label: t.stockActive,
                        value: overview?.stock.activeProducts,
                        tone: "text-foreground",
                      },
                      {
                        key: "low",
                        label: t.stockLow,
                        value: overview?.stock.lowStock,
                        tone: "text-status-orange",
                      },
                      {
                        key: "out",
                        label: t.stockOut,
                        value: overview?.stock.outOfStock,
                        tone: "text-status-red",
                      },
                    ].map((row) => (
                      <div
                        key={row.key}
                        className="flex items-baseline justify-between border-b border-border pb-2 last:border-0 last:pb-0"
                      >
                        <span className="text-[13px] text-muted-foreground">
                          {row.label}
                        </span>
                        <span className={`font-mono text-lg font-bold ${row.tone}`}>
                          {row.value ?? "—"}
                        </span>
                      </div>
                    ))}
                    <Link
                      href="/products"
                      className="mt-1 text-[13px] font-semibold text-foreground underline underline-offset-4"
                    >
                      {t.stockActive} →
                    </Link>
                  </div>
                </SectionCard>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}

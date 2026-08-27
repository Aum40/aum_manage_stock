"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/components/i18n/LocaleContext";

/**
 * ตัวเลขรวมทุกร้านตอบได้แค่ "ขายได้เท่าไหร่" แต่คำถามถัดไปเสมอคือร้านไหนขายได้
 * เท่าไหร่ ตารางนี้จึงเรียงจากมากไปน้อยพร้อมแถบสัดส่วน เห็นทันทีว่าร้านไหนแบก
 * ยอดอยู่และร้านไหนนิ่ง โดยไม่ต้องสลับร้านทีละร้านไปจดตัวเลขเอง
 *
 * ข้อมูลมาจาก GET /dashboard/summary ที่ api มีอยู่แล้ว (getAccountSummary)
 * เส้นนั้นกรองร้านตามสิทธิ์ให้แล้วผ่าน listVisibleShopIds — พนักงานที่เจ้าของร้าน
 * เปิด canViewDashboard ให้แค่บางร้าน จะเห็นเฉพาะร้านนั้น ไม่ใช่ทุกร้านของเจ้าของ
 *
 * เฉลี่ยต่อบิลคำนวณฝั่งนี้ เพราะ api ตอบรายร้านมาแค่ยอดรวมกับจำนวนบิล
 */

export type SummaryShopRow = {
  shopId: string;
  name: string;
  totalAmount: number;
  saleCount: number;
  lowStock: number;
};

const content = {
  th: {
    title: "ยอดขายรายร้าน",
    columns: ["ร้าน", "ยอดขาย", "บิล", "เฉลี่ย/บิล", "ใกล้หมด"],
    empty: "ยังไม่มีบิลขายในช่วงนี้",
    pick: "ดูแดชบอร์ดของร้านนี้",
    noSale: "ยังไม่มีบิล",
  },
  en: {
    title: "Sales by shop",
    columns: ["Shop", "Sales", "Bills", "Per bill", "Low stock"],
    empty: "No sales in this range yet",
    pick: "Open this shop's dashboard",
    noSale: "No bills",
  },
};

function baht(value: number, locale: string) {
  return `฿${value.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    maximumFractionDigits: 0,
  })}`;
}

export function ShopComparisonCard({
  rows,
  onPick,
}: {
  rows: SummaryShopRow[];
  /** คลิกชื่อร้านแล้วสลับแดชบอร์ดไปร้านนั้น — ตารางนี้เป็นทางเข้าของส่วนรายร้าน */
  onPick: (shopId: string) => void;
}) {
  const { locale } = useLocale();
  const t = content[locale];

  const peak = rows.reduce((max, row) => Math.max(max, row.totalAmount), 0);

  return (
    <Card className="p-0">
      <div className="px-5 pt-4 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
        {t.title}
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-150 border-collapse text-sm">
          <colgroup>
            <col />
            <col className="w-36" />
            <col className="w-24" />
            <col className="w-32" />
            <col className="w-28" />
          </colgroup>
          <thead>
            <tr className="border-y border-border bg-secondary/40">
              {t.columns.map((column, index) => (
                <th
                  key={column}
                  className={`px-5 py-2.5 text-xs font-medium tracking-[0.05em] whitespace-nowrap text-muted-foreground uppercase ${
                    index === 0 ? "text-left" : "text-right"
                  }`}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.shopId} className="border-b border-border last:border-0">
                <td className="px-5 py-3">
                  <button
                    type="button"
                    onClick={() => onPick(row.shopId)}
                    title={t.pick}
                    className="max-w-full truncate text-left font-medium underline-offset-4 hover:underline"
                  >
                    {row.name}
                  </button>
                  {/* แถบสัดส่วนเทียบกับร้านที่ขายดีที่สุด ไม่ใช่เทียบยอดรวม
                      เพราะร้านที่ 2 ควรอ่านออกว่าตามร้านที่ 1 อยู่แค่ไหน */}
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: peak === 0 ? "0%" : `${(row.totalAmount / peak) * 100}%`,
                      }}
                    />
                  </div>
                </td>
                <td className="px-5 py-3 text-right align-top font-mono font-semibold whitespace-nowrap">
                  {baht(row.totalAmount, locale)}
                </td>
                <td className="px-5 py-3 text-right align-top font-mono text-muted-foreground">
                  {row.saleCount}
                </td>
                <td className="px-5 py-3 text-right align-top font-mono text-[13px] text-muted-foreground whitespace-nowrap">
                  {row.saleCount === 0
                    ? t.noSale
                    : baht(row.totalAmount / row.saleCount, locale)}
                </td>
                <td className="px-5 py-3 text-right align-top whitespace-nowrap">
                  {row.lowStock === 0 ? (
                    <span className="font-mono text-muted-foreground">0</span>
                  ) : (
                    <Badge variant="warning">{row.lowStock}</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          {t.empty}
        </p>
      )}

      <div className="h-2" />
    </Card>
  );
}

"use client";

import TopBar from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useShops, useShopProducts, useStockMovements } from "@/lib/hooks/use-inventory";

const sourceVariant = { chatbot: "warning", scan: "success", manual: "neutral" } as const;

const content = {
  th: {
    title: "ประวัติการเคลื่อนไหวสต็อก",
    to: "ถึง",
    allProducts: "ทุกสินค้า",
    allPeople: "ทุกคน",
    allSources: "ทุกประเภท",
    sourceLabel: { chatbot: "chatbot", scan: "scan", manual: "manual" },
    filterBtn: "กรอง",
    columns: ["วันเวลา", "สินค้า", "เปลี่ยนแปลง", "ที่มา", "ผู้ทำรายการ", "หมายเหตุ"],
    rows: [
      { datetime: "17 ส.ค. 14:32", product: "โค้กกระป๋อง 325 มล.", change: "+10", from: 248, to: 258, source: "chatbot" as const, by: "คำหวาน", note: "—" },
      { datetime: "17 ส.ค. 13:05", product: "มามาห่มูสับ", change: "−5", from: 23, to: 18, source: "scan" as const, by: "ต้น", note: "บิล #S-000240" },
      { datetime: "16 ส.ค. 18:44", product: "น้ำดื่มตราสิงห์ 600 มล.", change: "−12", from: 12, to: 0, source: "scan" as const, by: "คำหวาน", note: "บิล #S-000236" },
      { datetime: "16 ส.ค. 09:12", product: "ลูกอมฮอลล์ เมนทอล", change: "+48", from: 16, to: 64, source: "manual" as const, by: "คุณอุ้ม", note: "รับของเข้าร้าน" },
      { datetime: "15 ส.ค. 17:20", product: "สบู่กูเก้ว (สูตรเดิม)", change: "−2", from: 29, to: 27, source: "manual" as const, by: "คุณอุ้ม", note: "ของชำรุด" },
    ],
  },
  en: {
    title: "Stock Movement History",
    to: "to",
    allProducts: "All Products",
    allPeople: "Everyone",
    allSources: "All Sources",
    sourceLabel: { chatbot: "chatbot", scan: "scan", manual: "manual" },
    filterBtn: "Filter",
    columns: ["Date/Time", "Product", "Change", "Source", "By", "Note"],
    rows: [
      { datetime: "Aug 17, 14:32", product: "Coke Can 325 ml.", change: "+10", from: 248, to: 258, source: "chatbot" as const, by: "Numwan", note: "—" },
      { datetime: "Aug 17, 13:05", product: "Mama Pork Noodles", change: "−5", from: 23, to: 18, source: "scan" as const, by: "Ton", note: "Bill #S-000240" },
      { datetime: "Aug 16, 18:44", product: "Singha Water 600 ml.", change: "−12", from: 12, to: 0, source: "scan" as const, by: "Numwan", note: "Bill #S-000236" },
      { datetime: "Aug 16, 09:12", product: "Hall's Mentho-Lyptus", change: "+48", from: 16, to: 64, source: "manual" as const, by: "Khun Aum", note: "Received stock" },
      { datetime: "Aug 15, 17:20", product: "Kuge Soap (Original)", change: "−2", from: 29, to: 27, source: "manual" as const, by: "Khun Aum", note: "Damaged goods" },
    ],
  },
};

export default function StockHistoryPage() {
  const { locale } = useLocale();
  const t = content[locale];
  const shopsQuery = useShops();
  const shopId = shopsQuery.data?.[0]?.id;
  const movementsQuery = useStockMovements(shopId);
  const shopProductsQuery = useShopProducts(shopId, { limit: 100 });
  const productNames = new Map(
    (shopProductsQuery.data?.items ?? []).map((item) => [item.id, item.product.name]),
  );
  const rows = movementsQuery.data?.items ?? [];

  return (
    <>
      <TopBar title={t.title} user={roleAvatar.owner[locale]} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="date"
              defaultValue="2026-08-10"
              className="rounded-lg border border-border bg-background px-3.5 py-2 font-mono text-[13px]"
            />
            <span className="text-[13px] text-muted-foreground">{t.to}</span>
            <input
              type="date"
              defaultValue="2026-08-17"
              className="rounded-lg border border-border bg-background px-3.5 py-2 font-mono text-[13px]"
            />
            <Select defaultValue="all">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allProducts}</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allPeople}</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allSources}</SelectItem>
                <SelectItem value="chatbot">{t.sourceLabel.chatbot}</SelectItem>
                <SelectItem value="scan">{t.sourceLabel.scan}</SelectItem>
                <SelectItem value="manual">{t.sourceLabel.manual}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="dark" size="sm">
              {t.filterBtn}
            </Button>
          </div>

          <Card className="p-0 overflow-x-auto">
            <table className="w-full min-w-125 border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  {t.columns.map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-medium tracking-[0.05em] whitespace-nowrap text-muted-foreground uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      {movementsQuery.isLoading ? "กำลังโหลดข้อมูล…" : "ยังไม่มีประวัติสต็อก"}
                    </td>
                  </tr>
                )}
                {rows.map((row) => {
                  const isPositive = row.quantityDelta >= 0;
                  const source = row.movementType === "CHAT_ADJUSTMENT"
                    ? "chatbot"
                    : row.movementType === "SALE" || row.movementType === "SALE_VOID"
                      ? "scan"
                      : "manual";
                  return (
                    <tr key={row.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3.5 font-mono text-xs whitespace-nowrap text-muted-foreground">
                        {new Date(row.createdAt).toLocaleString(locale === "th" ? "th-TH" : "en-US")}
                      </td>
                      <td className="px-5 py-3.5 font-medium">
                        {productNames.get(row.shopProductId) ?? row.shopProductId}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`font-mono text-[13px] font-semibold ${
                            isPositive ? "text-status-green" : "text-destructive"
                          }`}
                        >
                          {row.quantityDelta > 0 ? "+" : ""}{row.quantityDelta}
                        </span>
                        <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
                          ({row.quantityBefore} → {row.quantityAfter})
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={sourceVariant[source]}>
                          {t.sourceLabel[source]}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {row.actorId ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-muted-foreground">
                        {row.note ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      </main>
    </>
  );
}

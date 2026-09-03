"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/components/i18n/LocaleContext";
import { api } from "@/lib/api-client";
import type { Shop } from "@/lib/hooks/use-inventory";

/**
 * การ์ดตัวเลข "สินค้าใกล้หมด" บอกได้แค่ว่ามีกี่รายการ แต่ไม่บอกว่าตัวไหน
 * และที่สาขาไหน ซึ่งเป็นสองอย่างที่ต้องรู้ถึงจะไปเติมของถูก
 *
 * ใช้ GET /shops/:id/products/low-stock ที่มีอยู่แล้วแต่ยังไม่เคยถูกเรียกจากหน้าไหน
 * เส้นนี้เทียบ stockQty กับ lowStockThreshold ราย shop_product ด้วย field reference
 * ของ Prisma จึงเทียบคนละเกณฑ์ต่อสินค้าได้ ไม่ใช่เลขตายตัวก้อนเดียวทั้งร้าน
 *
 * ยิงทีละร้านเพราะไม่มี endpoint เดียวที่ตอบข้ามร้านได้ — ร้านมากสุด 5 ร้าน
 * (แพ็กเกจ Pro) จึงไม่เกิน 5 คำขอ และ react-query แคชแยกต่อร้านอยู่แล้ว
 */

type LowStockRow = {
  id: string;
  stockQty: number;
  lowStockThreshold: number;
  product: { id: string; name: string; unit: string };
};

const content = {
  th: {
    title: "สินค้าใกล้หมด",
    scope: "ทุกสาขา",
    columns: ["สินค้า", "สาขา", "คงเหลือ", "จุดแจ้งเตือน"],
    empty: "ไม่มีสินค้าใกล้หมด สต็อกทุกสาขายังอยู่เหนือจุดแจ้งเตือน",
    loading: "กำลังตรวจสต็อกทุกสาขา…",
    outOfStock: "หมดแล้ว",
    manage: "ไปหน้าสินค้า →",
    more: (n: number) => `และอีก ${n} รายการ`,
  },
  en: {
    title: "Running low",
    scope: "All shops",
    columns: ["Product", "Shop", "In stock", "Alert at"],
    empty: "Nothing is running low — every shop is above its alert level.",
    loading: "Checking stock across all shops…",
    outOfStock: "Out of stock",
    manage: "Go to products →",
    more: (n: number) => `and ${n} more`,
  },
};

const MAX_ROWS = 8;

export function LowStockByShopCard({ shops }: { shops: Shop[] }) {
  const { locale } = useLocale();
  const t = content[locale];

  const queries = useQueries({
    queries: shops.map((shop) => ({
      queryKey: ["dashboard", "low-stock", shop.id],
      queryFn: () =>
        api.get<LowStockRow[]>(
          `/api/backend/shops/${shop.id}/products/low-stock`,
        ),
    })),
  });

  const isLoading = queries.some((query) => query.isLoading);

  /** ของที่หมดแล้วสำคัญกว่าของที่ใกล้หมด จึงเรียงจากน้อยไปมาก */
  const rows = useMemo(() => {
    const list: { key: string; name: string; unit: string; shop: string; stockQty: number; threshold: number }[] = [];
    queries.forEach((query, index) => {
      const shop = shops[index];
      if (!shop || !query.data) return;
      for (const row of query.data) {
        list.push({
          key: row.id,
          name: row.product.name,
          unit: row.product.unit,
          shop: shop.name,
          stockQty: row.stockQty,
          threshold: row.lowStockThreshold,
        });
      }
    });
    return list.sort((a, b) => a.stockQty - b.stockQty);
  }, [queries, shops]);

  const shown = rows.slice(0, MAX_ROWS);
  const hidden = rows.length - shown.length;

  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4">
        <div className="font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
          {t.title}
          <span className="ml-2 font-sans font-normal tracking-normal text-muted-foreground normal-case">
            {t.scope}
          </span>
        </div>
        {rows.length > 0 && (
          <span className="font-mono text-sm font-bold">{rows.length}</span>
        )}
      </div>

      {isLoading && (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          {t.loading}
        </p>
      )}

      {!isLoading && rows.length === 0 && (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          {t.empty}
        </p>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-125 border-collapse text-sm">
            <colgroup>
              <col />
              <col className="w-56" />
              <col className="w-32" />
              <col className="w-32" />
            </colgroup>
            <thead>
              <tr className="border-y border-border bg-secondary/40">
                {t.columns.map((column, index) => (
                  <th
                    key={column}
                    className={`px-5 py-2.5 text-xs font-medium tracking-[0.05em] whitespace-nowrap text-muted-foreground uppercase ${
                      index >= 2 ? "text-right" : "text-left"
                    }`}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr key={row.key} className="border-b border-border last:border-0">
                  <td className="truncate px-5 py-3 font-medium">
                    {row.name}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      / {row.unit}
                    </span>
                  </td>
                  <td className="truncate px-5 py-3 text-muted-foreground">
                    {row.shop}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    {row.stockQty === 0 ? (
                      <Badge variant="error">{t.outOfStock}</Badge>
                    ) : (
                      <span className="font-mono font-semibold text-status-orange">
                        {row.stockQty}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-[13px] text-muted-foreground">
                    {row.threshold}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between px-5 py-3">
        <span className="text-xs text-muted-foreground">
          {hidden > 0 ? t.more(hidden) : ""}
        </span>
        <Link
          href="/products"
          className="text-[13px] font-semibold text-primary"
        >
          {t.manage}
        </Link>
      </div>
    </Card>
  );
}

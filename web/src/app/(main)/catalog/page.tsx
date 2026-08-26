"use client";

import Link from "next/link";
import { useState } from "react";

import TopBar from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import QuotaMeter from "@/components/shared/QuotaMeter";
import QuotaStrip from "@/components/shared/QuotaStrip";
import Caption from "@/components/shared/Caption";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useMySubscription, useProducts } from "@/lib/hooks/use-inventory";

const content = {
  th: {
    title: "แคตตาล็อกสินค้ากลาง",
    quotaLabel: "สินค้าในแคตตาล็อก",
    upgradeLink: "อัปเกรดเพื่อเพิ่มโควตา",
    searchPlaceholder: "ค้นหาด้วยชื่อหรือการแสกน…",
    allCategories: "ทุกหมวดหมู่",
    allShops: "ทุกร้าน",
    addBtn: "เพิ่มสินค้าใหม่ →",
    columns: ["สินค้า", "หมวดหมู่", "ต้นทุน", "ขายในร้าน", ""],
    notSelling: "ไม่ขายเลย",
    editBtn: "แก้ไข",
    addToShopBtn: "เพิ่มเข้าร้าน",
    caption:
      "สินค้าหนึ่งรายการในแคตตาล็อกกลาง สามารถเข้าได้หลายร้าน โดยแต่ละร้านมีราคาขายและสต็อกแยกกัน และนับโควตาเพียง 1 รายการ",
  },
  en: {
    title: "Product Catalog",
    quotaLabel: "Products in Catalog",
    upgradeLink: "Upgrade to increase quota",
    searchPlaceholder: "Search by name or scan…",
    allCategories: "All Categories",
    allShops: "All Shops",
    addBtn: "Add New Product →",
    columns: ["Product", "Category", "Cost", "Sold At", ""],
    notSelling: "Not selling anywhere",
    editBtn: "Edit",
    addToShopBtn: "Add to Shop",
    caption:
      "One item in the central catalog can be sold at multiple shops, each with its own sell price and stock, and counts toward the quota only once.",
  },
};

export default function ProductCatalogPage() {
  const { locale } = useLocale();
  const t = content[locale];
  const [search, setSearch] = useState("");
  const productsQuery = useProducts({ q: search || undefined, limit: 100 });
  const subscriptionQuery = useMySubscription();
  const productQuota = subscriptionQuery.data?.quotas.product;
  const products = productsQuery.data?.items ?? [];

  return (
    <>
      <TopBar title={t.title} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="flex flex-col gap-5">
          <QuotaStrip>
            <div className="flex-1">
              <QuotaMeter label={t.quotaLabel} used={productQuota?.used ?? 0} total={productQuota?.allowed ?? 0} />
            </div>
            <button className="text-xs font-semibold whitespace-nowrap text-primary">
              {t.upgradeLink}
            </button>
          </QuotaStrip>

          <div className="flex items-center gap-3">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.searchPlaceholder} className="flex-1" />
            <Select defaultValue="all-cat">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-cat">{t.allCategories}</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all-shop">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-shop">{t.allShops}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="dark" render={<Link href="/catalog/new" />}>
              {t.addBtn}
            </Button>
          </div>

          <Card className="p-0 overflow-x-auto">
            <table className="w-full min-w-125 border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  {t.columns.map((col, i) => (
                    <th
                      key={i}
                      className={`px-5 py-3.5 text-xs font-medium tracking-[0.05em] text-muted-foreground uppercase ${
                        col === t.columns[2] ? "text-right" : "text-left"
                      }`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productsQuery.isLoading && <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">กำลังโหลดข้อมูล…</td></tr>}
                {!productsQuery.isLoading && products.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">ยังไม่มีสินค้าในแคตตาล็อก</td></tr>}
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3.5 font-medium">{p.name}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{p.categoryId ?? "—"}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-[13px]">
                      —
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="neutral">{t.notSelling}</Badge>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <button className="mr-3 text-[13px] text-muted-foreground">
                        {t.editBtn}
                      </button>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-[13px] font-semibold"
                        render={<Link href="/catalog/add-to-shop" />}
                      >
                        {t.addToShopBtn}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Caption>{t.caption}</Caption>
        </div>
      </main>
    </>
  );
}

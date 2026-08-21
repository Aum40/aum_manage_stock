"use client";

import Link from "next/link";

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
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";

const shopColors: Record<string, string> = { ล: "#F5A31C", บ: "#5C9A54", L: "#F5A31C", B: "#5C9A54" };

const content = {
  th: {
    title: "แคตตาล็อกสินค้ากลาง",
    quotaLabel: "สินค้าในแคตตาล็อก",
    upgradeLink: "อัปเกรดเพื่อเพิ่มโควตา",
    searchPlaceholder: "ค้นหาด้วยชื่อหรือการแสกน…",
    allCategories: "ทุกหมวดหมู่",
    allShops: "ทุกร้าน",
    shopA: "สาขาลาดพร้าว",
    shopB: "สาขาบางนา",
    addBtn: "เพิ่มสินค้าใหม่ →",
    columns: ["สินค้า", "หมวดหมู่", "ต้นทุน", "ขายในร้าน", ""],
    notSelling: "ไม่ขายเลย",
    editBtn: "แก้ไข",
    addToShopBtn: "เพิ่มเข้าร้าน",
    caption:
      "สินค้าหนึ่งรายการในแคตตาล็อกกลาง สามารถเข้าได้หลายร้าน โดยแต่ละร้านมีราคาขายและสต็อกแยกกัน และนับโควตาเพียง 1 รายการ",
    products: [
      { name: "โค้กกระป๋อง 325 มล.", category: "เครื่องดื่ม", cost: "11.00", shops: ["ล", "บ"] },
      { name: "มามาห่มูสับ", category: "บะหมี่-เส้น", cost: "5.50", shops: ["ล"] },
      { name: "น้ำดื่มตราสิงห์ 600 มล.", category: "เครื่องดื่ม", cost: "6.00", shops: ["ล", "บ"] },
      { name: "สบู่กูเก้ว (สูตรเดิม)", category: "ของใช้", cost: "9.00", shops: [] as string[] },
    ],
  },
  en: {
    title: "Product Catalog",
    quotaLabel: "Products in Catalog",
    upgradeLink: "Upgrade to increase quota",
    searchPlaceholder: "Search by name or scan…",
    allCategories: "All Categories",
    allShops: "All Shops",
    shopA: "Lat Phrao Branch",
    shopB: "Bang Na Branch",
    addBtn: "Add New Product →",
    columns: ["Product", "Category", "Cost", "Sold At", ""],
    notSelling: "Not selling anywhere",
    editBtn: "Edit",
    addToShopBtn: "Add to Shop",
    caption:
      "One item in the central catalog can be sold at multiple shops, each with its own sell price and stock, and counts toward the quota only once.",
    products: [
      { name: "Coke Can 325 ml.", category: "Drinks", cost: "11.00", shops: ["L", "B"] },
      { name: "Mama Pork Noodles", category: "Noodles", cost: "5.50", shops: ["L"] },
      { name: "Singha Water 600 ml.", category: "Drinks", cost: "6.00", shops: ["L", "B"] },
      { name: "Kuge Soap (Original)", category: "Sundries", cost: "9.00", shops: [] as string[] },
    ],
  },
};

export default function ProductCatalogPage() {
  const { locale } = useLocale();
  const t = content[locale];

  return (
    <>
      <TopBar title={t.title} user={roleAvatar.owner[locale]} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="flex flex-col gap-5">
          <QuotaStrip>
            <div className="flex-1">
              <QuotaMeter label={t.quotaLabel} used={78} total={100} />
            </div>
            <button className="text-xs font-semibold whitespace-nowrap text-primary">
              {t.upgradeLink}
            </button>
          </QuotaStrip>

          <div className="flex items-center gap-3">
            <Input placeholder={t.searchPlaceholder} className="flex-1" />
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
                <SelectItem value="shop-a">{t.shopA}</SelectItem>
                <SelectItem value="shop-b">{t.shopB}</SelectItem>
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
                {t.products.map((p, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-5 py-3.5 font-medium">{p.name}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {p.category}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-[13px]">
                      ฿{p.cost}
                    </td>
                    <td className="px-5 py-3.5">
                      {p.shops.length === 0 ? (
                        <Badge variant="neutral">{t.notSelling}</Badge>
                      ) : (
                        <div className="flex">
                          {p.shops.map((s, idx) => (
                            <div
                              key={s}
                              className="flex size-7 items-center justify-center rounded-lg border-2 border-secondary font-heading text-[13px] font-bold text-white"
                              style={{
                                backgroundColor: shopColors[s],
                                marginLeft: idx === 0 ? 0 : -6,
                              }}
                            >
                              {s}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <button className="mr-3 text-[13px] text-muted-foreground">
                        {t.editBtn}
                      </button>
                      {p.shops.length === 0 && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-[13px] font-semibold"
                          render={<Link href="/catalog/add-to-shop" />}
                        >
                          {t.addToShopBtn}
                        </Button>
                      )}
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

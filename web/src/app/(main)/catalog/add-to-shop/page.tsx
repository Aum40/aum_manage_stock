"use client";

import { useState } from "react";
import Link from "next/link";

import TopBar from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";

const content = {
  th: {
    title: "เพิ่มสินค้าเข้าร้าน",
    intro: "เลือกสินค้าจากแคตตาล็อกกลางมาขายที่",
    shopName: "อุ้มมินิมาร์ท สาขาบางนา",
    introEnd: "แล้วตั้งราคาและสต็อกเริ่มต้นของร้านนี้",
    searchPlaceholder: "ค้นหาสินค้าในแคตตาล็อก…",
    colProduct: "สินค้า",
    colPrice: "ราคาขาย",
    colStock: "สต็อกเริ่มต้น",
    alreadySelling: "ขายอยู่แล้ว",
    selectedCount: (n: number) => `เลือกแล้ว ${n} รายการ`,
    addBtn: "เพิ่มเข้าร้าน →",
    cancelBtn: "ยกเลิก",
    items: [
      { name: "โค้กกระป๋อง 325 มล.", barcode: "8850999320113", checked: true, alreadySelling: false, price: "15.00", stock: "120" },
      { name: "มามาห่มูสับ", barcode: "8850987101342", checked: true, alreadySelling: false, price: "7.00", stock: "60" },
      { name: "สบู่กูเก้ว (สูตรเดิม)", barcode: "8850002214668", checked: false, alreadySelling: false, price: "", stock: "" },
      { name: "น้ำดื่มตราสิงห์ 600 มล.", barcode: "8850100200457", checked: true, alreadySelling: true, price: "10.00", stock: "0" },
    ],
  },
  en: {
    title: "Add Product to Shop",
    intro: "Select products from the central catalog to sell at",
    shopName: "Aum Minimart — Bang Na",
    introEnd: ", then set this shop's starting price and stock.",
    searchPlaceholder: "Search products in catalog…",
    colProduct: "Product",
    colPrice: "Sell Price",
    colStock: "Initial Stock",
    alreadySelling: "Already selling",
    selectedCount: (n: number) => `${n} selected`,
    addBtn: "Add to Shop →",
    cancelBtn: "Cancel",
    items: [
      { name: "Coke Can 325 ml.", barcode: "8850999320113", checked: true, alreadySelling: false, price: "15.00", stock: "120" },
      { name: "Mama Pork Noodles", barcode: "8850987101342", checked: true, alreadySelling: false, price: "7.00", stock: "60" },
      { name: "Kuge Soap (Original)", barcode: "8850002214668", checked: false, alreadySelling: false, price: "", stock: "" },
      { name: "Singha Water 600 ml.", barcode: "8850100200457", checked: true, alreadySelling: true, price: "10.00", stock: "0" },
    ],
  },
};

export default function SelectProductForShopPage() {
  const { locale } = useLocale();
  const t = content[locale];
  const [checked, setChecked] = useState(t.items.map((i) => i.checked));
  const [prices, setPrices] = useState(t.items.map((i) => i.price));
  const [stocks, setStocks] = useState(t.items.map((i) => i.stock));

  const selectedCount = checked.filter(
    (c, i) => c && !t.items[i].alreadySelling
  ).length;

  return (
    <>
      <TopBar title={t.title} user={roleAvatar.owner[locale]} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="flex flex-col gap-5">
          <div className="text-sm text-muted-foreground">
            {t.intro} <strong className="text-foreground">{t.shopName}</strong>
            {t.introEnd}
          </div>

          <Input placeholder={t.searchPlaceholder} className="max-w-sm" />

          <Card className="p-0 overflow-x-auto">
            <table className="w-full min-w-125 border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-10 px-5 py-3" />
                  <th className="px-5 py-3 text-left text-xs font-medium tracking-[0.05em] text-muted-foreground uppercase">
                    {t.colProduct}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium tracking-[0.05em] text-muted-foreground uppercase">
                    {t.colPrice}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium tracking-[0.05em] text-muted-foreground uppercase">
                    {t.colStock}
                  </th>
                </tr>
              </thead>
              <tbody>
                {t.items.map((item, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-5 py-3.5">
                      {item.alreadySelling ? (
                        <Badge variant="neutral">{t.alreadySelling}</Badge>
                      ) : (
                        <input
                          type="checkbox"
                          checked={checked[i]}
                          onChange={(e) =>
                            setChecked((prev) =>
                              prev.map((c, idx) =>
                                idx === i ? e.target.checked : c
                              )
                            )
                          }
                          className="size-4 accent-primary"
                        />
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium">{item.name}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {item.barcode}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Input
                        value={prices[i]}
                        onChange={(e) =>
                          setPrices((prev) =>
                            prev.map((v, idx) => (idx === i ? e.target.value : v))
                          )
                        }
                        disabled={!checked[i] || item.alreadySelling}
                        className="w-20 text-right font-mono"
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <Input
                        value={stocks[i]}
                        onChange={(e) =>
                          setStocks((prev) =>
                            prev.map((v, idx) => (idx === i ? e.target.value : v))
                          )
                        }
                        disabled={!checked[i] || item.alreadySelling}
                        className="w-20 text-right font-mono"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between rounded-b-3xl bg-secondary px-5 py-3.5">
              <span className="text-[13px] text-muted-foreground">
                {t.selectedCount(selectedCount)}
              </span>
              <div className="flex gap-2.5">
                <Button variant="gradient" size="sm">
                  {t.addBtn}
                </Button>
                <Button variant="ghost" size="sm" render={<Link href="/catalog" />}>
                  {t.cancelBtn}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}

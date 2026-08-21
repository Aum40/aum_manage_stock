"use client";

import { useState } from "react";
import Link from "next/link";

import TopBar from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Stepper from "@/components/shared/Stepper";
import Caption from "@/components/shared/Caption";
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";

type Status = "success" | "warning" | "error" | "neutral";

const content = {
  th: {
    title: "สินค้าและสต็อก",
    searchPlaceholder: "ค้นหาสินค้าด้วยชื่อหรือการแสกน…",
    allCategories: "ทุกหมวดหมู่",
    categories: { drink: "เครื่องดื่ม", noodle: "บะหมี่/เส้น", misc: "ของใช้" },
    addBtn: "เพิ่มสินค้าใหม่ →",
    recentLabel: "ดูล่าสุด:",
    frequentLabel: "ขายบ่อย:",
    recentChips: ["โค้กกระป๋อง 325 มล.", "มามาห่มูสับ", "น้ำดื่มตราสิงห์ 600 มล."],
    frequentChips: ["ลูกอมฮอลล์ เมนทอล"],
    columns: ["สินค้า", "หมวดหมู่", "บาร์โค้ด", "ราคาขาย", "คงเหลือ", "สถานะ", ""],
    restoreBtn: "กู้คืน",
    editBtn: "แก้ไข",
    caption:
      "การรับคำนวณจากหน้านี้จะถูกบันทึกเข้าประวัติสต็อก เช่นเดียวกับรายการ manual ทุกช่องทางที่ทำรายการเสมอ",
    products: [
      { name: "โค้กกระป๋อง 325 มล.", category: "เครื่องดื่ม", barcode: "8850999320113", price: "15.00", qty: 248, status: "success" as Status, statusLabel: "ปกติ" },
      { name: "มามาห่มูสับ", category: "บะหมี่/เส้น", barcode: "8850987101342", price: "7.00", qty: 18, status: "warning" as Status, statusLabel: "ใกล้หมด" },
      { name: "น้ำดื่มตราสิงห์ 600 มล.", category: "เครื่องดื่ม", barcode: "8850100200457", price: "10.00", qty: 0, status: "error" as Status, statusLabel: "หมด" },
      { name: "สบู่กูเก้ว (สูตรเดิม)", category: "ของใช้", barcode: "8850002214668", price: "12.00", qty: 36, status: "neutral" as Status, statusLabel: "ถอดอยู่", hidden: true },
    ],
  },
  en: {
    title: "Products & Stock",
    searchPlaceholder: "Search products by name or scan…",
    allCategories: "All Categories",
    categories: { drink: "Drinks", noodle: "Noodles", misc: "Sundries" },
    addBtn: "Add New Product →",
    recentLabel: "Recently viewed:",
    frequentLabel: "Frequently sold:",
    recentChips: ["Coke Can 325 ml.", "Mama Pork Noodles", "Singha Water 600 ml."],
    frequentChips: ["Hall's Mentho-Lyptus"],
    columns: ["Product", "Category", "Barcode", "Sell Price", "Stock", "Status", ""],
    restoreBtn: "Restore",
    editBtn: "Edit",
    caption:
      "Any change recorded from this page is logged to stock history, just like every other manual entry across every channel.",
    products: [
      { name: "Coke Can 325 ml.", category: "Drinks", barcode: "8850999320113", price: "15.00", qty: 248, status: "success" as Status, statusLabel: "Normal" },
      { name: "Mama Pork Noodles", category: "Noodles", barcode: "8850987101342", price: "7.00", qty: 18, status: "warning" as Status, statusLabel: "Low Stock" },
      { name: "Singha Water 600 ml.", category: "Drinks", barcode: "8850100200457", price: "10.00", qty: 0, status: "error" as Status, statusLabel: "Out of Stock" },
      { name: "Kuge Soap (Original)", category: "Sundries", barcode: "8850002214668", price: "12.00", qty: 36, status: "neutral" as Status, statusLabel: "Delisted", hidden: true },
    ],
  },
};

export default function ProductsStockPage() {
  const { locale } = useLocale();
  const t = content[locale];
  const [products, setProducts] = useState(t.products);

  const updateQty = (i: number, delta: number) => {
    setProducts((prev) =>
      prev.map((p, idx) =>
        idx === i ? { ...p, qty: Math.max(0, p.qty + delta) } : p
      )
    );
  };

  return (
    <>
      <TopBar title={t.title} user={roleAvatar.owner[locale]} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <Input placeholder={t.searchPlaceholder} className="flex-1" />
            <Select defaultValue="all">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allCategories}</SelectItem>
                <SelectItem value="drink">{t.categories.drink}</SelectItem>
                <SelectItem value="noodle">{t.categories.noodle}</SelectItem>
                <SelectItem value="misc">{t.categories.misc}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="dark" render={<Link href="/products/new" />}>
              {t.addBtn}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{t.recentLabel}</span>
            {t.recentChips.map((c) => (
              <button
                key={c}
                className="rounded-full bg-secondary px-3.5 py-1 text-xs text-foreground/70"
              >
                {c}
              </button>
            ))}
            <span className="ml-2 text-xs text-muted-foreground">
              {t.frequentLabel}
            </span>
            {t.frequentChips.map((c) => (
              <button
                key={c}
                className="rounded-full bg-secondary px-3.5 py-1 text-xs text-foreground/70"
              >
                {c}
              </button>
            ))}
          </div>

          <Card className="p-0 overflow-x-auto">
            <table className="w-full min-w-125 border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  {t.columns.map((col, i) => (
                    <th
                      key={i}
                      className={`px-5 py-3.5 text-xs font-medium tracking-[0.05em] whitespace-nowrap text-muted-foreground uppercase ${
                        col === t.columns[3] || col === t.columns[4]
                          ? "text-right"
                          : "text-left"
                      }`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr
                    key={i}
                    className="border-b border-border last:border-0"
                    style={{ opacity: p.hidden ? 0.6 : 1 }}
                  >
                    <td className="px-5 py-3.5 font-medium">{p.name}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {p.category}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[13px] text-foreground/70">
                      {p.barcode}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-[13px]">
                      ฿{p.price}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Stepper
                        value={p.qty}
                        onInc={() => updateQty(i, 1)}
                        onDec={() => updateQty(i, -1)}
                        className="justify-end"
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={p.status}>{p.statusLabel}</Badge>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {p.hidden ? (
                        <button className="text-[13px] font-semibold text-primary">
                          {t.restoreBtn}
                        </button>
                      ) : (
                        <button className="text-[13px] text-muted-foreground">
                          {t.editBtn}
                        </button>
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

"use client";

import { useState } from "react";

import TopBar from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Stepper from "@/components/shared/Stepper";
import QuotaMeter from "@/components/shared/QuotaMeter";
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";

type Status = "success" | "warning" | "error" | "neutral";

const content = {
  th: {
    title: "สินค้าและสต็อก",
    bannerTitle: "สินค้าครบ 100 รายการแล้ว",
    bannerBody:
      "Free Plan จำกัดสินค้า active ได้สูงสุด 100 รายการ — อัปเกรดเป็น Plus เพื่อเพิ่มเป็น 3,000 รายการ",
    upgradeBtn: "อัปเกรดตอนนี้ →",
    searchPlaceholder: "ค้นหาสินค้าด้วยชื่อหรือการแสกน…",
    allCategories: "ทุกหมวดหมู่",
    addBtn: "เพิ่มสินค้าใหม่",
    addBtnDisabledHint: "ปิดใช้งานเพราะเต็มโควตาแล้ว",
    quotaLabel: "สินค้า",
    columns: ["สินค้า", "หมวดหมู่", "บาร์โค้ด", "ราคาขาย", "คงเหลือ", "สถานะ", ""],
    restoreBtn: "กู้คืน",
    editBtn: "แก้ไข",
    products: [
      { name: "โค้กกระป๋อง 325 มล.", category: "เครื่องดื่ม", barcode: "8850999320113", price: "15.00", qty: 248, status: "success" as Status, statusLabel: "ปกติ" },
      { name: "มามาห่มูสับ", category: "บะหมี่/เส้น", barcode: "8850987101342", price: "7.00", qty: 18, status: "warning" as Status, statusLabel: "ใกล้หมด" },
      { name: "น้ำดื่มตราสิงห์ 600 มล.", category: "เครื่องดื่ม", barcode: "8850100200457", price: "10.00", qty: 0, status: "error" as Status, statusLabel: "หมด" },
      { name: "สบู่กูเก้ว (สูตรเดิม)", category: "ของใช้", barcode: "8850002214668", price: "12.00", qty: 36, status: "neutral" as Status, statusLabel: "ถอดอยู่", hidden: true },
    ],
  },
  en: {
    title: "Products & Stock",
    bannerTitle: "You've hit the 100-product limit",
    bannerBody:
      "The Free Plan caps active products at 100 — upgrade to Plus to raise it to 3,000.",
    upgradeBtn: "Upgrade Now →",
    searchPlaceholder: "Search products by name or scan…",
    allCategories: "All Categories",
    addBtn: "Add New Product",
    addBtnDisabledHint: "Disabled because you're at your quota",
    quotaLabel: "Products",
    columns: ["Product", "Category", "Barcode", "Sell Price", "Stock", "Status", ""],
    restoreBtn: "Restore",
    editBtn: "Edit",
    products: [
      { name: "Coke Can 325 ml.", category: "Drinks", barcode: "8850999320113", price: "15.00", qty: 248, status: "success" as Status, statusLabel: "Normal" },
      { name: "Mama Pork Noodles", category: "Noodles", barcode: "8850987101342", price: "7.00", qty: 18, status: "warning" as Status, statusLabel: "Low Stock" },
      { name: "Singha Water 600 ml.", category: "Drinks", barcode: "8850100200457", price: "10.00", qty: 0, status: "error" as Status, statusLabel: "Out of Stock" },
      { name: "Kuge Soap (Original)", category: "Sundries", barcode: "8850002214668", price: "12.00", qty: 36, status: "neutral" as Status, statusLabel: "Delisted", hidden: true },
    ],
  },
};

export default function ProductLimitHitPage() {
  const { locale } = useLocale();
  const t = content[locale];
  const [qtys, setQtys] = useState(t.products.map((p) => p.qty));

  return (
    <>
      <TopBar title={t.title} user={roleAvatar.free[locale]} />
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
            <Button variant="gradient">{t.upgradeBtn}</Button>
          </div>

          <div className="flex items-start gap-3">
            <Input placeholder={t.searchPlaceholder} className="flex-1" />
            <Select defaultValue="all">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allCategories}</SelectItem>
              </SelectContent>
            </Select>
            <div>
              <Button variant="secondary" disabled className="cursor-not-allowed opacity-50">
                {t.addBtn}
              </Button>
              <div className="mt-1 text-center text-[11px] text-muted-foreground">
                {t.addBtnDisabledHint}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-secondary px-5 py-3.5">
            <QuotaMeter label={t.quotaLabel} used={100} total={100} />
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
                {t.products.map((p, i) => (
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
                        value={qtys[i]}
                        onInc={() =>
                          setQtys((q) => q.map((v, idx) => (idx === i ? v + 1 : v)))
                        }
                        onDec={() =>
                          setQtys((q) =>
                            q.map((v, idx) => (idx === i ? Math.max(0, v - 1) : v))
                          )
                        }
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
        </div>
      </main>
    </>
  );
}

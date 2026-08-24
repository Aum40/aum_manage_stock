"use client";

import { useState } from "react";
import Link from "next/link";

import TopBar from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";

const content = {
  th: {
    title: "เพิ่มสินค้าใหม่",
    card1Heading: "ข้อมูลสินค้า (ใช้ร่วมทุกร้าน)",
    card1Sub: "ข้อมูลนี้ใช้เปลี่ยนชื่อทุกร้านที่ขายสินค้านี้",
    name: "ชื่อสินค้า",
    namePh: "เช่น โค้กกระป๋อง 325 มล.",
    category: "หมวดหมู่",
    categories: { drink: "เครื่องดื่ม", noodle: "บะหมี่/เส้น" },
    barcode: "บาร์โค้ด",
    barcodePh: "ห้ามซ้ำกับสินค้าอื่นของคุณ",
    cost: "ต้นทุน (บาท)",
    unit: "หน่วยนับ",
    units: { piece: "ชิ้น" },
    image: "รูปสินค้า",
    imageHint: "คลิกเพื่ออัปโหลดหรือลากวางรูปที่นี่",
    card2Heading: "ตั้งราคาและสต็อกรายร้าน",
    card2Sub: "เลือกร้านที่จะขายสินค้านี้ แล้วระบุราคาและสต็อกต่างกันได้",
    priceLabel: "ราคาขาย",
    stockLabel: "สต็อกเริ่มต้น",
    alertLabel: "แจ้งเตือนเมื่อ",
    shop1: "อุ้มมินิมาร์ท สาขาลาดพร้าว",
    shop2: "อุ้มมินิมาร์ท สาขาบางนา",
    quotaNote:
      "สินค้านี้จะนับเข้าโควตา 1 รายการ ไม่ว่าจะขายกี่ร้านก็ตาม (ปัจจุบัน 78 จาก 100 รายการ)",
    saveBtn: "บันทึกสินค้า →",
    cancelBtn: "ยกเลิก",
  },
  en: {
    title: "Add New Product",
    card1Heading: "Product Info (shared across shops)",
    card1Sub: "This info updates the name at every shop selling this product.",
    name: "Product Name",
    namePh: "e.g. Coke Can 325 ml.",
    category: "Category",
    categories: { drink: "Drinks", noodle: "Noodles" },
    barcode: "Barcode",
    barcodePh: "Must not clash with another one of your products",
    cost: "Cost (THB)",
    unit: "Unit",
    units: { piece: "Piece" },
    image: "Product Image",
    imageHint: "Click to upload or drag & drop an image here",
    card2Heading: "Set Per-Shop Price & Stock",
    card2Sub: "Choose which shops sell this product, each with its own price and stock.",
    priceLabel: "Sell Price",
    stockLabel: "Initial Stock",
    alertLabel: "Alert At",
    shop1: "Aum Minimart — Lat Phrao",
    shop2: "Aum Minimart — Bang Na",
    quotaNote:
      "This product counts as 1 toward your quota no matter how many shops sell it (currently 78 of 100).",
    saveBtn: "Save Product →",
    cancelBtn: "Cancel",
  },
};

export default function AddProductFullPage() {
  const { locale } = useLocale();
  const t = content[locale];
  const [shop1, setShop1] = useState(true);
  const [shop2, setShop2] = useState(false);

  return (
    <>
      <TopBar title={t.title} user={roleAvatar.owner[locale]} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="flex max-w-3xl flex-col gap-5">
          <Card>
            <div className="px-6">
              <div className="mb-1 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                {t.card1Heading}
              </div>
              <p className="mb-4.5 text-xs text-muted-foreground">{t.card1Sub}</p>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-semibold tracking-[0.08em] uppercase">
                    {t.name}
                  </Label>
                  <Input placeholder={t.namePh} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] font-semibold tracking-[0.08em] uppercase">
                      {t.category}
                    </Label>
                    <Select defaultValue="drink">
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="drink">{t.categories.drink}</SelectItem>
                        <SelectItem value="noodle">{t.categories.noodle}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] font-semibold tracking-[0.08em] uppercase">
                      {t.barcode}
                    </Label>
                    <Input placeholder={t.barcodePh} className="font-mono" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] font-semibold tracking-[0.08em] uppercase">
                      {t.cost}
                    </Label>
                    <Input type="number" placeholder="0.00" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] font-semibold tracking-[0.08em] uppercase">
                      {t.unit}
                    </Label>
                    <Select defaultValue="piece">
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="piece">{t.units.piece}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="mb-2 text-[11px] font-semibold tracking-[0.08em] uppercase">
                    {t.image}
                  </Label>
                  <div className="rounded-2xl border-2 border-dashed border-border bg-[#faf9f6] px-5 py-7 text-center text-[13px] text-muted-foreground">
                    <div className="mb-1.5 text-2xl">📷</div>
                    {t.imageHint}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="px-6">
              <div className="mb-1 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                {t.card2Heading}
              </div>
              <p className="mb-4.5 text-xs text-muted-foreground">{t.card2Sub}</p>

              {[
                { name: t.shop1, on: shop1, setOn: setShop1, price: "15.00", stock: "248", alert: "24" },
                { name: t.shop2, on: shop2, setOn: setShop2, price: "", stock: "", alert: "" },
              ].map((s, i, arr) => (
                <div
                  key={s.name}
                  className={`flex flex-wrap items-center gap-4 py-4 ${
                    i < arr.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <Switch checked={s.on} onCheckedChange={s.setOn} />
                  <div className="min-w-0 flex-1 text-sm font-semibold">
                    {s.name}
                  </div>
                  <div
                    className={`flex gap-2.5 ${s.on ? "" : "pointer-events-none opacity-35"}`}
                  >
                    <Input defaultValue={s.price} placeholder={t.priceLabel} className="w-25" />
                    <Input defaultValue={s.stock} placeholder={t.stockLabel} className="w-25" />
                    <Input defaultValue={s.alert} placeholder={t.alertLabel} className="w-30" />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Alert variant="info">
            <AlertDescription className="text-foreground/80">
              {t.quotaNote}
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-3">
            <Button variant="gradient">{t.saveBtn}</Button>
            <Button variant="ghost" render={<Link href="/catalog" />}>
              {t.cancelBtn}
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}

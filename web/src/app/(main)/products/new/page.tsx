"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import TopBar from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useCategories, useCreateProduct } from "@/lib/hooks/use-inventory";

const content = {
  th: {
    title: "เพิ่มสินค้าใหม่",
    heading: "เพิ่มสินค้าใหม่",
    name: "ชื่อสินค้า",
    namePh: "เช่น โค้กกระป๋อง 325 มล.",
    category: "หมวดหมู่",
    categories: { drink: "เครื่องดื่ม", noodle: "บะหมี่/เส้น", misc: "ของใช้" },
    barcode: "บาร์โค้ด",
    barcodePh: "สแกนหรือพิมพ์ (หากไม่ทำเว้นว่าง)",
    cost: "ต้นทุน (บาท)",
    unit: "หน่วยนับ",
    units: { piece: "ชิ้น", bottle: "ขวด", pack: "แพ็ก", bag: "ห่อ" },
    alertThreshold: "จุดแจ้งเตือนสต็อกต่ำ",
    alertPh: "เช่น 24",
    image: "รูปสินค้า",
    imageHint: "คลิกเพื่ออัปโหลดหรือลากวางรูปที่นี่",
    imageLimit: "PNG, JPG ขนาดไม่เกิน 5 MB",
    saveBtn: "บันทึกสินค้า →",
    cancelBtn: "ยกเลิก",
  },
  en: {
    title: "Add New Product",
    heading: "Add New Product",
    name: "Product Name",
    namePh: "e.g. Coke Can 325 ml.",
    category: "Category",
    categories: { drink: "Drinks", noodle: "Noodles", misc: "Sundries" },
    barcode: "Barcode",
    barcodePh: "Scan or type (leave blank if none)",
    cost: "Cost (THB)",
    unit: "Unit",
    units: { piece: "Piece", bottle: "Bottle", pack: "Pack", bag: "Bag" },
    alertThreshold: "Low-Stock Alert Threshold",
    alertPh: "e.g. 24",
    image: "Product Image",
    imageHint: "Click to upload or drag & drop an image here",
    imageLimit: "PNG, JPG up to 5 MB",
    saveBtn: "Save Product →",
    cancelBtn: "Cancel",
  },
};

export default function AddProductPage() {
  const { locale } = useLocale();
  const t = content[locale];
  const router = useRouter();
  const createProduct = useCreateProduct();
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [unit, setUnit] = useState("piece");
  const [categoryId, setCategoryId] = useState("");
  const categoriesQuery = useCategories();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || createProduct.isPending) return;
    createProduct.mutate(
      {
        name: name.trim(),
        unit,
        barcode: barcode.trim() || undefined,
        categoryId: categoryId || undefined,
      },
      { onSuccess: () => router.push("/products") },
    );
  };

  return (
    <>
      <TopBar title={t.title} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <Card className="max-w-3xl">
          <form className="px-6" onSubmit={onSubmit}>
            <div className="mb-5 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
              {t.heading}
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <Label className="text-[11px] font-semibold tracking-[0.08em] uppercase">
                  {t.name}
                </Label>
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t.namePh} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-semibold tracking-[0.08em] uppercase">
                    {t.category}
                  </Label>
                  <Select value={categoryId} onValueChange={(value) => setCategoryId(value ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriesQuery.data?.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-semibold tracking-[0.08em] uppercase">
                    {t.barcode}
                  </Label>
                  <Input value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder={t.barcodePh} className="font-mono" />
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
                  <Select value={unit} onValueChange={(value) => setUnit(value ?? "piece")}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="piece">{t.units.piece}</SelectItem>
                      <SelectItem value="bottle">{t.units.bottle}</SelectItem>
                      <SelectItem value="pack">{t.units.pack}</SelectItem>
                      <SelectItem value="bag">{t.units.bag}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-semibold tracking-[0.08em] uppercase">
                    {t.alertThreshold}
                  </Label>
                  <Input type="number" placeholder={t.alertPh} />
                </div>
              </div>

              <div>
                <Label className="mb-2 text-[11px] font-semibold tracking-[0.08em] uppercase">
                  {t.image}
                </Label>
                <div className="rounded-2xl border-2 border-dashed border-border bg-[#faf9f6] px-5 py-8 text-center text-sm text-muted-foreground">
                  <div className="mb-2 text-2xl">📷</div>
                  {t.imageHint}
                  <div className="mt-1 text-xs">{t.imageLimit}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Button type="submit" variant="gradient" disabled={createProduct.isPending || !name.trim()}>
                  {createProduct.isPending ? "กำลังบันทึก…" : t.saveBtn}
                </Button>
                <Button variant="ghost" render={<Link href="/products" />}>
                  {t.cancelBtn}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </main>
    </>
  );
}

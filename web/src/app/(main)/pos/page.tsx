"use client";

import { useState } from "react";

import TopBar from "@/components/layout/TopBar";
import BarcodeScanner from "@/components/features/barcode/BarcodeScanner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Stepper from "@/components/shared/Stepper";
import Caption from "@/components/shared/Caption";
import { useLocale } from "@/components/i18n/LocaleContext";
import { ApiError } from "@/lib/api-client";
import { useCreateSale, useScanSale, useShops } from "@/lib/hooks/use-inventory";
import { useSelectedShop } from "@/components/shared/SelectedShopContext";

type PosItem = {
  shopProductId: string;
  name: string;
  price: number;
  qty: number;
};

const content = {
  th: {
    title: "ขายหน้าร้าน (POS)",
    scanHeading: "สแกนบาร์โค้ด",
    scanHint: "เล็งกล้องไปที่บาร์โค้ดสินค้า",
    scanFormats: "รองรับ EAN-13 และ QR",
    scanInputPh: "หรือพิมพ์บาร์โค้ดเอง แล้วกด Enter",
    scanAdded: "เพิ่มลงบิลแล้ว",
    scanNotFound: "ไม่พบสินค้าที่ใช้บาร์โค้ดนี้ในร้าน — เพิ่มสินค้าก่อนถึงจะขายได้",
    billHeading: "บิลปัจจุบัน",
    colProduct: "สินค้า",
    colPrice: "ราคา",
    colQty: "จำนวน",
    colTotal: "รวม",
    totalItems: (n: number) => `ยอดรวม ${n} ชิ้น`,
    clearBtn: "ล้างบิล",
    confirmBtn: "ยืนยันการขาย →",
    caption: "เมื่อยืนยัน ระบบจะบันทึกสต็อกอัตโนมัติและบันทึกลง ประวัติเป็นรายการ scan",
    items: [
      { name: "โค้กกระป๋อง 325 มล.", price: 15, qty: 2 },
      { name: "ลูกอมฮอลล์ เมนทอล", price: 22, qty: 1 },
      { name: "มามาห่มูสับ", price: 7, qty: 5 },
    ],
  },
  en: {
    title: "Point of Sale (POS)",
    scanHeading: "Scan Barcode",
    scanHint: "Point the camera at the product barcode",
    scanFormats: "Supports EAN-13 and QR",
    scanInputPh: "Or type the barcode and press Enter",
    scanAdded: "Added to the bill",
    scanNotFound: "No product in this shop uses that barcode — add the product before selling it.",
    billHeading: "Current Bill",
    colProduct: "Product",
    colPrice: "Price",
    colQty: "Qty",
    colTotal: "Total",
    totalItems: (n: number) => `${n} items total`,
    clearBtn: "Clear Bill",
    confirmBtn: "Confirm Sale →",
    caption: "Confirming will auto-update stock and log a \"scan\" entry to stock history.",
    items: [
      { name: "Coke Can 325 ml.", price: 15, qty: 2 },
      { name: "Hall's Mentho-Lyptus", price: 22, qty: 1 },
      { name: "Mama Pork Noodles", price: 7, qty: 5 },
    ],
  },
};

export default function POSPage() {
  const { locale } = useLocale();
  const t = content[locale];
  const shopsQuery = useShops();
  const shops = shopsQuery.data ?? [];
  const { selectedShopId } = useSelectedShop();
  // ร้านที่เคยเลือกอาจถูกลบไปแล้ว — ตกกลับไปร้านแรกเหมือนที่ (main)/layout.tsx ทำ
  const shopId =
    selectedShopId && shops.some((shop) => shop.id === selectedShopId)
      ? selectedShopId
      : shops[0]?.id;
  const scanSale = useScanSale(shopId);
  const createSale = useCreateSale(shopId);
  const [barcode, setBarcode] = useState("");
  const [items, setItems] = useState<PosItem[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  /**
   * [อั้ม] รับบาร์โค้ดจากสองทาง — กล้อง กับช่องพิมพ์ — เลยแยกออกมารับค่าเป็น
   * พารามิเตอร์ ไม่อ่านจาก state โดยตรง เพราะ callback ที่ส่งเข้ากล้องไปแล้ว
   * จะปิดทับค่า state ณ ตอนนั้นไว้ ถ้าอ่านจาก state จะได้ค่าเก่าเสมอ
   */
  const submitBarcode = (raw: string) => {
    const value = raw.trim();
    if (!value || scanSale.isPending) return;
    setScanError(null);
    scanSale.mutate(value, {
      onError: (cause) => {
        setLastAdded(null);
        // 404 = ร้านนี้ไม่มีสินค้าที่ผูกบาร์โค้ดนี้ไว้ ซึ่งเป็นเคสที่เจอบ่อยสุดตอนใช้จริง
        setScanError(
          cause instanceof ApiError && cause.status === 404
            ? t.scanNotFound
            : (cause as Error).message,
        );
      },
      onSuccess: (product) => {
        setItems((previous) => {
          const existing = previous.find((item) => item.shopProductId === product.shopProductId);
          if (existing) {
            return previous.map((item) =>
              item.shopProductId === product.shopProductId
                ? { ...item, qty: item.qty + 1 }
                : item,
            );
          }
          return [
            ...previous,
            {
              shopProductId: product.shopProductId,
              name: product.name,
              price: Number(product.unitPrice),
              qty: 1,
            },
          ];
        });
        setBarcode("");
        setLastAdded(product.name);
      },
    });
  };

  const scanBarcode = () => submitBarcode(barcode);

  const updateQty = (i: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((item, idx) =>
          idx === i ? { ...item, qty: Math.max(0, item.qty + delta) } : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const totalItems = items.reduce((s, i) => s + i.qty, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <>
      <TopBar title={t.title} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(340px,30rem)_1fr]">
          <Card>
            <div className="px-5">
              <div className="mb-4 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                {t.scanHeading}
              </div>
              {/* [อั้ม] กรอบเดิมเป็นภาพประกอบเฉย ๆ เปลี่ยนเป็นกล้องจริง */}
              <BarcodeScanner onScan={submitBarcode} />

              <Input
                value={barcode}
                onChange={(event) => setBarcode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    scanBarcode();
                  }
                }}
                placeholder={t.scanInputPh}
                className="mt-3.5 font-mono"
              />

              {scanError && (
                <p className="mt-2 rounded-md border border-status-red/30 bg-status-red/10 px-3 py-2 text-xs text-status-red">
                  {scanError}
                </p>
              )}

              {!scanError && lastAdded && (
                <p className="mt-2 text-xs text-status-green">
                  {t.scanAdded}: {lastAdded}
                </p>
              )}
            </div>
          </Card>

          <div className="flex flex-col gap-3">
            <Card className="flex-1">
              <div className="px-5">
                <div className="mb-4 flex items-baseline justify-between">
                  <div className="font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                    {t.billHeading}
                  </div>
                  <span className="font-mono text-[13px] text-muted-foreground">
                    #S-000241
                  </span>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full min-w-100 border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-1.5 text-left font-medium text-muted-foreground">
                        {t.colProduct}
                      </th>
                      <th className="py-1.5 text-right font-medium text-muted-foreground">
                        {t.colPrice}
                      </th>
                      <th className="py-1.5 text-center font-medium text-muted-foreground">
                        {t.colQty}
                      </th>
                      <th className="py-1.5 text-right font-medium text-muted-foreground">
                        {t.colTotal}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.shopProductId} className="border-b border-border">
                        <td className="py-3">{item.name}</td>
                        <td className="py-3 text-right font-mono text-[13px]">
                          ฿{item.price.toFixed(2)}
                        </td>
                        <td className="py-3 text-center">
                          <Stepper
                            value={item.qty}
                            onInc={() => updateQty(items.indexOf(item), 1)}
                            onDec={() => updateQty(items.indexOf(item), -1)}
                            className="justify-center"
                          />
                        </td>
                        <td className="py-3 text-right font-mono text-[13px] font-semibold">
                          ฿{(item.price * item.qty).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>

                <div className="mt-4 flex items-center justify-between border-t-2 border-border pt-4">
                  <div className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                    {t.totalItems(totalItems)}
                  </div>
                  <div className="font-mono text-3xl font-bold">
                    ฿{totalPrice.toFixed(2)}
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setItems([])}
                  className="text-sm font-semibold text-destructive"
                >
                  {t.clearBtn}
                </button>
                <Button
                  variant="gradient"
                  disabled={items.length === 0 || createSale.isPending}
                  onClick={() =>
                    createSale.mutate(
                      { items: items.map(({ shopProductId, qty }) => ({ shopProductId, quantity: qty })) },
                      { onSuccess: () => setItems([]) },
                    )
                  }
                >
                  {createSale.isPending ? "กำลังบันทึก…" : t.confirmBtn}
                </Button>
              </div>
              <Caption>{t.caption}</Caption>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

import TopBar from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Caption from "@/components/shared/Caption";
import BarcodeScanner from "@/components/features/barcode/BarcodeScanner";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useSelectedShop } from "@/components/shared/SelectedShopContext";
import { ApiError, api } from "@/lib/api-client";
import {
  inventoryKeys,
  useShopProducts,
  useShops,
  type ShopProduct,
} from "@/lib/hooks/use-inventory";

/**
 * [อั้ม] รับสินค้าเข้าด้วยการยิงบาร์โค้ด
 *
 * บาร์โค้ดที่ยิงต้อง **ตรงกับเลขที่บันทึกไว้ตอนเพิ่มสินค้า** เท่านั้น ยิงแล้ว
 * ระบบหาสินค้าเจอ = +1 หาไม่เจอ = แจ้งเตือน ไม่เดาว่าน่าจะเป็นสินค้าตัวไหน
 *
 * เคยทำเป็นแบบ "เลือกสินค้าปลายทางไว้ก่อน แล้วบาร์โค้ดที่ไม่รู้จักให้บวกเข้า
 * ตัวนั้นพร้อมจำเลขไว้ให้" แต่เปลี่ยนมาเป็นแบบเข้มงวดเพราะแบบเดิมยิงผิดตัวแล้ว
 * ไม่มีอะไรเตือนเลย ของเข้าผิดสินค้าโดยที่คนยิงไม่รู้ตัว — ของเข้าคลังผิดตัว
 * แก้ทีหลังยากกว่าการเสียเวลาไปผูกบาร์โค้ดให้ถูกตั้งแต่แรกมาก
 *
 * ตัวเลขที่นับไว้เขียนลงฐานข้อมูลครั้งเดียวตอนกดบันทึก ไม่ใช่ยิงทีละครั้ง
 * เพราะ stock_movements เป็น ledger เขียนแล้วลบไม่ได้ — ยิง 12 ครั้งไม่ควร
 * กลายเป็นประวัติ 12 แถว และถ้ายิงพลาดจะแก้ก่อนบันทึกได้
 */

type Line = {
  shopProductId: string;
  name: string;
  unit: string;
  barcode: string;
  qty: number;
};

const content = {
  th: {
    title: "รับสินค้าเข้า (สแกน)",
    scanHeading: "สแกนบาร์โค้ด",
    scanHint: "ยิงหนึ่งครั้ง = +1 ยิงรัวได้เลย ระบบจะแยกสินค้าให้เองจากบาร์โค้ด",
    manualPh: "หรือพิมพ์บาร์โค้ดเอง แล้วกด Enter",
    listHeading: "รายการที่นับได้",
    listEmpty: "ยังไม่มีรายการ — เริ่มยิงบาร์โค้ดได้เลย",
    colQty: "จำนวน",
    remove: "เอาออก",
    totalLabel: "รวมทั้งหมด",
    totalUnit: "ชิ้น",
    saveBtn: "บันทึกรับเข้า →",
    saving: "กำลังบันทึก…",
    clearBtn: "ล้างรายการ",
    noShop: "ยังไม่มีร้าน — สร้างร้านก่อนถึงจะรับสินค้าเข้าได้",
    createShop: "ไปสร้างร้าน",
    added: "เพิ่มแล้ว",
    // ต้องบอกให้ชัดว่า "อ่านสำเร็จแล้ว" — ไม่งั้นคนอ่านนึกว่าสแกนไม่ติด
    scanOk: "สแกนอ่านเลขได้แล้ว",
    notFound: "แต่ยังไม่มีสินค้าไหนในร้านใช้บาร์โค้ดนี้",
    notFoundHow:
      "ต้องบันทึกเลขบาร์โค้ดนี้ไว้กับสินค้าก่อน ถึงจะยิงรับเข้าได้ — ไปที่หน้าสินค้า แล้วใส่บาร์โค้ดให้สินค้าตัวนั้น",
    goCatalog: "ไปหน้าสินค้า",
    savedTitle: "บันทึกเรียบร้อย",
    savedBody: "สต็อกอัปเดตแล้ว และบันทึกลงประวัติสต็อกเป็นรายการรับเข้า",
    savedAgain: "รับเข้าอีกรอบ",
    savedHistory: "ดูประวัติสต็อก",
    note: "สต็อกจะเปลี่ยนตอนกดบันทึกเท่านั้น ยิงผิดแก้ตัวเลขในรายการได้ก่อน",
  },
  en: {
    title: "Stock In (Scan)",
    scanHeading: "Scan barcode",
    scanHint:
      "One scan = +1. Scan away — the barcode tells us which product it is.",
    manualPh: "Or type the barcode and press Enter",
    listHeading: "Counted so far",
    listEmpty: "Nothing yet — start scanning.",
    colQty: "Qty",
    remove: "Remove",
    totalLabel: "Total",
    totalUnit: "pcs",
    saveBtn: "Save stock in →",
    saving: "Saving…",
    clearBtn: "Clear list",
    noShop: "No shop yet — create one before receiving stock.",
    createShop: "Create a shop",
    added: "Added",
    scanOk: "Scanned successfully",
    notFound: "but no product in this shop uses that barcode yet.",
    notFoundHow:
      "Record this barcode on the product first — open the products page and set its barcode.",
    goCatalog: "Open products",
    savedTitle: "Saved",
    savedBody: "Stock updated and written to the stock history as a stock-in entry.",
    savedAgain: "Receive more",
    savedHistory: "View stock history",
    note: "Stock only changes when you save — fix a miscount in the list first.",
  },
};

export default function StockInPage() {
  const { locale } = useLocale();
  const t = content[locale];
  const queryClient = useQueryClient();

  const shopsQuery = useShops();
  const shops = shopsQuery.data ?? [];
  const { selectedShopId } = useSelectedShop();
  // ร้านที่เคยเลือกอาจถูกลบไปแล้ว — ตกกลับไปร้านแรกเหมือนหน้าอื่น
  const shopId =
    selectedShopId && shops.some((shop) => shop.id === selectedShopId)
      ? selectedShopId
      : shops[0]?.id;

  /**
   * เทียบบาร์โค้ดฝั่ง client เป็นหลัก เพราะยิงรัว ๆ แล้วรอ network ทุกครั้งไม่ทัน
   * แต่ backend จำกัด limit ไว้ที่ 100 — ร้านที่สินค้าเกินนั้นจะหาไม่เจอในลิสต์นี้
   * เลยมี fallback ไปถาม server ต่อใน findByBarcode() ข้างล่าง
   */
  const shopProductsQuery = useShopProducts(shopId, { limit: 100 });
  const shopProducts = useMemo(
    () => shopProductsQuery.data?.items ?? [],
    [shopProductsQuery.data],
  );

  const [barcode, setBarcode] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // ยิงไม่เจอ กับบันทึกไม่สำเร็จ ต้องแนะนำคนละอย่าง อย่ายุบเป็น error เดียว
  const [errorIsUnknownBarcode, setErrorIsUnknownBarcode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const bump = (item: ShopProduct, scanned: string) => {
    setLines((previous) => {
      const existing = previous.find((line) => line.shopProductId === item.id);
      if (existing) {
        return previous.map((line) =>
          line.shopProductId === item.id ? { ...line, qty: line.qty + 1 } : line,
        );
      }
      return [
        ...previous,
        {
          shopProductId: item.id,
          name: item.product.name,
          unit: item.product.unit,
          barcode: scanned,
          qty: 1,
        },
      ];
    });
  };

  /** หาสินค้าที่ผูกบาร์โค้ดนี้ไว้ — ในลิสต์ก่อน ไม่เจอค่อยถาม server */
  const findByBarcode = async (value: string) => {
    const local = shopProducts.find((item) => item.product.barcode === value);
    if (local) return local;

    try {
      const found = await api.get<{ items: ShopProduct[] }>(
        `/api/backend/shops/${shopId}/products?q=${encodeURIComponent(value)}&limit=5`,
      );
      // backend ค้นแบบ contains — ต้องกรองเอาที่ตรงเป๊ะเท่านั้น
      return found.items.find((item) => item.product.barcode === value) ?? null;
    } catch {
      return null;
    }
  };

  const submitBarcode = async (raw: string) => {
    const value = raw.trim();
    if (!value) return;

    setError(null);
    setErrorIsUnknownBarcode(false);
    setBarcode("");

    const found = await findByBarcode(value);

    // ไม่เดาว่าเป็นสินค้าตัวไหน — บาร์โค้ดไม่ตรงคือไม่ตรง
    if (!found) {
      setHint(null);
      setErrorIsUnknownBarcode(true);
      setError(`${t.scanOk}: ${value} — ${t.notFound}`);
      return;
    }

    bump(found, value);
    setHint(`${t.added}: ${found.product.name}`);
  };

  const setQty = (shopProductId: string, qty: number) => {
    setLines((previous) =>
      previous
        .map((line) =>
          line.shopProductId === shopProductId
            ? { ...line, qty: Math.max(0, qty) }
            : line,
        )
        .filter((line) => line.qty > 0),
    );
  };

  const removeLine = (shopProductId: string) =>
    setLines((previous) =>
      previous.filter((line) => line.shopProductId !== shopProductId),
    );

  const total = lines.reduce((sum, line) => sum + line.qty, 0);

  const onSave = async () => {
    if (!shopId || lines.length === 0 || saving) return;
    setError(null);
    setErrorIsUnknownBarcode(false);
    setSaving(true);

    try {
      for (const line of lines) {
        await api.post(`/api/backend/shops/${shopId}/stock/adjust`, {
          shopProductId: line.shopProductId,
          operation: "INCREASE",
          quantity: line.qty,
          note: locale === "th" ? "รับเข้าด้วยการสแกน" : "Received by scan",
        });
      }

      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      setLines([]);
      setHint(null);
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : (cause as Error).message,
      );
    } finally {
      setSaving(false);
    }
  };

  if (!shopsQuery.isLoading && shops.length === 0) {
    return (
      <>
        <TopBar title={t.title} />
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
          <Card>
            <div className="flex flex-col items-start gap-3 px-5 py-4">
              <p className="text-sm text-muted-foreground">{t.noShop}</p>
              <Button render={<Link href="/shops" />} variant="dark" size="sm">
                {t.createShop}
              </Button>
            </div>
          </Card>
        </main>
      </>
    );
  }

  if (saved) {
    return (
      <>
        <TopBar title={t.title} />
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
          <Card>
            <div className="flex flex-col items-start gap-3 px-5 py-4">
              <div className="font-heading text-base font-bold text-status-green">
                {t.savedTitle}
              </div>
              <p className="text-sm text-muted-foreground">{t.savedBody}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="dark" size="sm" onClick={() => setSaved(false)}>
                  {t.savedAgain}
                </Button>
                <Button
                  render={<Link href="/stock-history" />}
                  variant="outline"
                  size="sm"
                >
                  {t.savedHistory}
                </Button>
              </div>
            </div>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title={t.title} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(380px,42rem)_1fr]">
          <Card>
            <div className="flex flex-col gap-3 px-5">
              <div className="font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                {t.scanHeading}
              </div>

              <BarcodeScanner onScan={(value) => void submitBarcode(value)} />

              <Input
                value={barcode}
                onChange={(event) => setBarcode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void submitBarcode(barcode);
                  }
                }}
                placeholder={t.manualPh}
                className="font-mono"
              />

              <Caption>{t.scanHint}</Caption>

              {error && (
                <div className="flex flex-col items-start gap-2 rounded-md border border-status-red/30 bg-status-red/10 px-3 py-2">
                  <p className="text-xs text-status-red">{error}</p>
                  {errorIsUnknownBarcode && (
                    <>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {t.notFoundHow}
                      </p>
                      <Button
                        render={<Link href="/catalog" />}
                        variant="outline"
                        size="xs"
                      >
                        {t.goCatalog}
                      </Button>
                    </>
                  )}
                </div>
              )}

              {!error && hint && (
                <p className="text-xs text-status-green">{hint}</p>
              )}
            </div>
          </Card>

          <div className="flex flex-col gap-3">
            <Card className="flex-1">
              <div className="px-5">
                <div className="mb-4 flex items-baseline justify-between">
                  <div className="font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                    {t.listHeading}
                  </div>
                  {lines.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setLines([])}
                      className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                    >
                      {t.clearBtn}
                    </button>
                  )}
                </div>

                {lines.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {t.listEmpty}
                  </p>
                ) : (
                  <div className="flex flex-col divide-y divide-border">
                    {lines.map((line) => (
                      <div
                        key={line.shopProductId}
                        className="flex items-center gap-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">
                            {line.name}
                          </div>
                          <div className="truncate font-mono text-[11px] text-muted-foreground">
                            {line.barcode}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => setQty(line.shopProductId, line.qty - 1)}
                          >
                            −
                          </Button>
                          <span className="w-10 text-center font-mono text-sm font-bold">
                            {line.qty}
                          </span>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => setQty(line.shopProductId, line.qty + 1)}
                          >
                            +
                          </Button>
                          <span className="w-10 text-xs text-muted-foreground">
                            {line.unit}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeLine(line.shopProductId)}
                          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-status-red"
                        >
                          {t.remove}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3 px-5">
                <div className="text-sm">
                  {t.totalLabel}{" "}
                  <span className="font-mono text-lg font-bold">{total}</span>{" "}
                  {t.totalUnit}
                </div>
                <Button
                  variant="dark"
                  disabled={lines.length === 0 || saving}
                  onClick={() => void onSave()}
                >
                  {saving ? t.saving : t.saveBtn}
                </Button>
              </div>
            </Card>

            <Caption>{t.note}</Caption>
          </div>
        </div>
      </main>
    </>
  );
}

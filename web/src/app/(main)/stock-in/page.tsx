"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

import TopBar from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
 * วิธีใช้ที่ตกลงกันไว้ — เลือกสินค้าปลายทางไว้ก่อน แล้วยิงรัวได้เลย ยิงหนึ่งครั้ง
 * คือ +1 ของสินค้าตัวนั้น ยิงไปเรื่อย ๆ จนกว่าจะเปลี่ยนสินค้าปลายทาง
 *
 * สองอย่างที่ทำให้มันไม่ใช่แค่ที่นับเลข:
 *
 * 1. ถ้าบาร์โค้ดที่ยิงตรงกับสินค้าที่ผูกไว้แล้ว จะสลับปลายทางไปตัวนั้นให้เอง
 *    ไม่ต้องเลือกเองทีละตัว — รับของเข้าทีเดียวหลายชนิดได้
 * 2. ถ้ายังไม่มีสินค้าไหนผูกบาร์โค้ดนี้ไว้ จะจำไว้แล้วผูกให้สินค้าปลายทาง
 *    ตอนกดบันทึก ยิงครั้งหน้าถึงจะเข้าข้อ 1 ได้เอง
 *
 * ตัวเลขที่นับไว้เขียนลงฐานข้อมูลครั้งเดียวตอนกดบันทึก ไม่ใช่ยิงทีละครั้ง
 * เพราะ stock_movements เป็น ledger เขียนแล้วลบไม่ได้ — ยิง 12 ครั้งไม่ควร
 * กลายเป็นประวัติ 12 แถว และถ้ายิงพลาดจะแก้ก่อนบันทึกได้
 */

type Line = {
  shopProductId: string;
  name: string;
  unit: string;
  qty: number;
  /** บาร์โค้ดที่เพิ่งเรียนรู้มา — ผูกให้สินค้าตอนบันทึก (null = มีอยู่แล้ว) */
  learnedBarcode: string | null;
};

const content = {
  th: {
    title: "รับสินค้าเข้า (สแกน)",
    scanHeading: "สแกนบาร์โค้ด",
    targetLabel: "สินค้าที่กำลังรับเข้า",
    targetPh: "พิมพ์ชื่อสินค้าเพื่อค้นหา",
    targetNone: "ยังไม่ได้เลือก",
    targetHint:
      "เลือกไว้ตัวหนึ่งแล้วยิงได้รัว ๆ ยิงหนึ่งครั้ง = +1 จนกว่าจะเปลี่ยนสินค้า",
    manualPh: "หรือพิมพ์บาร์โค้ดเอง แล้วกด Enter",
    listHeading: "รายการที่นับได้",
    listEmpty: "ยังไม่มีรายการ — เลือกสินค้าแล้วเริ่มยิงบาร์โค้ดได้เลย",
    colProduct: "สินค้า",
    colQty: "จำนวน",
    remove: "เอาออก",
    totalLabel: "รวมทั้งหมด",
    totalUnit: "ชิ้น",
    saveBtn: "บันทึกรับเข้า →",
    saving: "กำลังบันทึก…",
    clearBtn: "ล้างรายการ",
    noShop: "ยังไม่มีร้าน — สร้างร้านก่อนถึงจะรับสินค้าเข้าได้",
    createShop: "ไปสร้างร้าน",
    noTarget: "เลือกสินค้าปลายทางก่อน ระบบถึงจะรู้ว่าบาร์โค้ดนี้คือสินค้าอะไร",
    learned: "จะผูกบาร์โค้ดนี้ให้สินค้าตอนบันทึก",
    matched: "ตรงกับสินค้าที่ผูกบาร์โค้ดไว้แล้ว",
    savedTitle: "บันทึกเรียบร้อย",
    savedBody: "สต็อกอัปเดตแล้ว และบันทึกลงประวัติสต็อกเป็นรายการรับเข้า",
    savedAgain: "รับเข้าอีกรอบ",
    savedHistory: "ดูประวัติสต็อก",
    note: "สต็อกจะเปลี่ยนตอนกดบันทึกเท่านั้น ยิงผิดแก้ตัวเลขในรายการได้ก่อน",
    loading: "กำลังโหลดรายการสินค้า…",
  },
  en: {
    title: "Stock In (Scan)",
    scanHeading: "Scan barcode",
    targetLabel: "Receiving into",
    targetPh: "Type a product name to search",
    targetNone: "Not selected",
    targetHint:
      "Pick one product, then scan freely — each scan is +1 until you switch product.",
    manualPh: "Or type the barcode and press Enter",
    listHeading: "Counted so far",
    listEmpty: "Nothing yet — pick a product and start scanning.",
    colProduct: "Product",
    colQty: "Qty",
    remove: "Remove",
    totalLabel: "Total",
    totalUnit: "pcs",
    saveBtn: "Save stock in →",
    saving: "Saving…",
    clearBtn: "Clear list",
    noShop: "No shop yet — create one before receiving stock.",
    createShop: "Create a shop",
    noTarget: "Pick the target product first, so we know what this barcode is.",
    learned: "This barcode will be linked to the product on save",
    matched: "Matched a product that already has this barcode",
    savedTitle: "Saved",
    savedBody: "Stock updated and written to the stock history as a stock-in entry.",
    savedAgain: "Receive more",
    savedHistory: "View stock history",
    note: "Stock only changes when you save — fix a miscount in the list first.",
    loading: "Loading products…",
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

  const [targetId, setTargetId] = useState("");
  const [search, setSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  /**
   * targetId ซ้ำไว้ใน ref ด้วย เพราะ submitBarcode เป็น async — ระหว่างรอ
   * findByBarcode() ค่า target ที่ปิดทับไว้ตอนเรียกอาจเก่าไปแล้ว ถ้ามีบาร์โค้ด
   * ตัวอื่นยิงเข้ามาคั่นแล้วสลับปลายทางไป จะบวกเข้าสินค้าผิดตัว
   */
  const targetIdRef = useRef("");
  const selectTarget = (id: string) => {
    targetIdRef.current = id;
    setTargetId(id);
  };

  const target = shopProducts.find((item) => item.id === targetId);
  const currentTarget = () =>
    shopProducts.find((item) => item.id === targetIdRef.current);

  const matches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return shopProducts.slice(0, 8);
    return shopProducts
      .filter((item) => item.product.name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [shopProducts, search]);

  const bump = (item: ShopProduct, learnedBarcode: string | null) => {
    setLines((previous) => {
      const existing = previous.find((line) => line.shopProductId === item.id);
      if (existing) {
        return previous.map((line) =>
          line.shopProductId === item.id
            ? {
                ...line,
                qty: line.qty + 1,
                // บาร์โค้ดที่เรียนมาทีหลังไม่ทับของเดิมที่ตั้งใจผูกไว้แล้ว
                learnedBarcode: line.learnedBarcode ?? learnedBarcode,
              }
            : line,
        );
      }
      return [
        ...previous,
        {
          shopProductId: item.id,
          name: item.product.name,
          unit: item.product.unit,
          qty: 1,
          learnedBarcode,
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
    setBarcode("");

    const known = await findByBarcode(value);

    if (known) {
      // ยิงเจอสินค้าที่ผูกไว้แล้ว — สลับปลายทางให้เอง ไม่ต้องเลือกเองทีละตัว
      selectTarget(known.id);
      bump(known, null);
      setHint(`${t.matched}: ${known.product.name}`);
      return;
    }

    const into = currentTarget();
    if (!into) {
      setHint(null);
      setError(t.noTarget);
      return;
    }

    bump(into, value);
    setHint(`${t.learned}: ${into.product.name} ← ${value}`);
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
    setSaving(true);

    try {
      for (const line of lines) {
        await api.post(`/api/backend/shops/${shopId}/stock/adjust`, {
          shopProductId: line.shopProductId,
          operation: "INCREASE",
          quantity: line.qty,
          note: locale === "th" ? "รับเข้าด้วยการสแกน" : "Received by scan",
        });

        /**
         * ผูกบาร์โค้ดหลังปรับสต็อกสำเร็จเท่านั้น และไม่ให้ล้มทั้งงานถ้าพลาด —
         * บาร์โค้ดซ้ำกับสินค้าตัวอื่นจะได้ 409 ซึ่งไม่ควรทำให้ของที่นับมา
         * ทั้งกองหายไป ของเข้าคลังแล้วก็จบ ค่อยไปผูกบาร์โค้ดเองทีหลังได้
         */
        if (line.learnedBarcode) {
          const productId = shopProducts.find(
            (item) => item.id === line.shopProductId,
          )?.productId;

          if (productId) {
            await api
              .patch(`/api/backend/products/${productId}`, {
                barcode: line.learnedBarcode,
              })
              .catch(() => undefined);
          }
        }
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
                <Button
                  variant="dark"
                  size="sm"
                  onClick={() => {
                    setSaved(false);
                    selectTarget("");
                    setSearch("");
                  }}
                >
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
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_1fr]">
          <Card>
            <div className="flex flex-col gap-3 px-5">
              <div className="font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                {t.scanHeading}
              </div>

              <div className="flex flex-col gap-1">
                <Label className="text-[11px] font-semibold tracking-[0.08em] uppercase">
                  {t.targetLabel}
                </Label>
                <div className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-semibold">
                  {target ? target.product.name : t.targetNone}
                </div>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t.targetPh}
                  className="mt-1"
                />

                {shopProductsQuery.isLoading ? (
                  <p className="text-xs text-muted-foreground">{t.loading}</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {matches.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          selectTarget(item.id);
                          setError(null);
                          setHint(null);
                        }}
                        className={
                          item.id === targetId
                            ? "rounded-full bg-brand-dark px-3 py-1 text-xs text-background"
                            : "rounded-full border border-border px-3 py-1 text-xs hover:bg-muted"
                        }
                      >
                        {item.product.name}
                      </button>
                    ))}
                  </div>
                )}

                <Caption>{t.targetHint}</Caption>
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

              {error && (
                <p className="rounded-md border border-status-red/30 bg-status-red/10 px-3 py-2 text-xs text-status-red">
                  {error}
                </p>
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
                          {line.learnedBarcode && (
                            <div className="truncate font-mono text-[11px] text-muted-foreground">
                              + {line.learnedBarcode}
                            </div>
                          )}
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

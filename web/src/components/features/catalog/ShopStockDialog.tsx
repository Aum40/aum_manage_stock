"use client";

import { useMemo, useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocale } from "@/components/i18n/LocaleContext";
import {
  ApiErrorNotice,
  toApiFailure,
  type ApiFailure,
} from "@/components/shared/ApiErrorNotice";
import { api, withQuery } from "@/lib/api-client";
import { inventoryKeys, type Shop } from "@/lib/hooks/use-inventory";

/**
 * แก้สต็อกของสินค้าหนึ่งตัวข้ามทุกร้านในกล่องเดียว และลงร้านใหม่พร้อมกำหนดจำนวน
 *
 * ทำไมไม่ให้พิมพ์ "ยอดรวม" ตรง ๆ — สต็อกเป็นค่าราย shop_products สินค้าตัวเดียว
 * ที่ขาย 3 ร้านมี 3 ยอด ถ้าให้พิมพ์ยอดรวมแล้วเกลี่ยเอง ระบบต้องเดาว่าจะบวก
 * ร้านไหนเท่าไหร่ ซึ่งเดาผิดแน่นอน จึงให้แก้รายร้านแล้วโชว์ผลรวมให้เห็นสด ๆ แทน
 *
 * ช่องกรอกเป็น "จำนวนที่ต้องการให้เป็น" ไม่ใช่ "บวก/ลบเท่าไหร่" เพราะคนนับของ
 * จริงจะได้ตัวเลขปลายทางมาจากการนับ ไม่ใช่ผลต่าง ตอนบันทึกถึงค่อยคิดผลต่าง
 * แล้วยิงเป็น INCREASE/DECREASE ให้ — สต็อกจึงยังเปลี่ยนผ่าน stock movement
 * ทางเดียวเหมือนเดิม ประวัติไม่มีรูโหว่
 *
 * queryKey ["catalog","shop-products",shopId] ตรงกับที่หน้า /catalog ใช้
 * กล่องนี้จึงอ่านจากแคชเดิมทันที ไม่ยิงซ้ำ และ invalidate ทีเดียวอัปเดตทั้งคู่
 *
 * ลดสต็อกแล้วเลือกได้ว่า "ขายไป" หรือ "ปรับสต็อก" — คนขายหน้าร้านไม่ได้เปิด POS
 * ทุกครั้ง แต่ระบบแยกเองไม่ได้ว่าของที่หายไปคือขายได้เงินหรือของเสีย/นับผิด
 * ถ้านับการลดสต็อกเป็นยอดขายทั้งหมด ตัวเลขรายได้จะเพี้ยนทันทีที่ทิ้งของเน่า
 *
 * เลือก "ขายไป" จะไม่ยิง stock/adjust แต่ยิง POST /shops/:id/sales ของพี่ดิว
 * ซึ่งสร้าง Sale + SaleItem + ตัดสต็อกให้เองผ่าน movementType 'SALE' ครบในทีเดียว
 * ห้ามยิงทั้งสองเส้น ไม่งั้นสต็อกจะถูกหักสองรอบ
 *
 * ยอดคิดจาก sellPrice ปัจจุบันของร้านนั้น ถ้าวันนั้นลดราคาให้ลูกค้า
 * ตัวเลขจะไม่ตรงกับเงินจริง — จงใจไม่ใส่ช่องกรอกราคาเพราะจะทำให้กล่องรกเกินไป
 */

type ShopProductRow = {
  id: string;
  productId: string;
  status: string;
  stockQty: number;
  sellPrice: number | string;
};

/** ของที่หายไปจากชั้นมีสองความหมาย ระบบเดาเองไม่ได้ ต้องให้คนบอก */
type Intent = "sale" | "adjust";

interface DialogProduct {
  id: string;
  name: string;
  unit: string;
}

interface ShopStockDialogProps {
  product: DialogProduct | null;
  shops: Shop[];
  onClose: () => void;
}

type NewListing = {
  sellPrice: string;
  costPrice: string;
  stock: string;
  threshold: string;
};

const EMPTY_LISTING: NewListing = {
  sellPrice: "",
  costPrice: "",
  stock: "",
  threshold: "",
};

const content = {
  th: {
    title: "สต็อกรายร้าน",
    description:
      "แก้จำนวนของแต่ละร้านได้จากตรงนี้ ยอดรวมด้านล่างจะขยับตาม — ทุกการเปลี่ยนแปลงถูกบันทึกเข้าประวัติสต็อก",
    selling: "ขายอยู่",
    notSelling: "ยังไม่ได้ลง",
    listHere: "ลงร้านนี้",
    cancelListing: "ไม่ลงร้านนี้",
    sellPrice: "ราคาขาย",
    costPrice: "ต้นทุน",
    initialStock: "จำนวนเริ่มต้น",
    threshold: "แจ้งเตือนเมื่อเหลือ",
    noteLabel: "หมายเหตุ (ไม่บังคับ)",
    notePh: "เช่น นับสต็อกประจำเดือน",
    total: "คงเหลือรวม",
    changes: (n: number) => `จะบันทึก ${n} รายการ`,
    noChanges: "ยังไม่มีอะไรเปลี่ยน",
    save: "บันทึก",
    saving: "กำลังบันทึก…",
    close: "ปิด",
    noShops: "ยังไม่มีร้านค้า",
    needPrice: "ร้านที่จะลงต้องใส่ราคาขาย",
    defaultNote: "ปรับจากหน้าแคตตาล็อก",
    defaultSaleNote: "ขายหน้าร้าน (บันทึกจากแคตตาล็อก)",
    reasonLabel: "ของที่หายไปเพราะ",
    intentSale: "ขายไป",
    intentAdjust: "ปรับสต็อก",
    intentSaleHint: "เปิดบิลจริง ยอดขายบนแดชบอร์ดจะขยับ",
    intentAdjustHint: "ของเสีย ของหมดอายุ หรือนับใหม่ — ไม่นับเป็นรายได้",
    billPreview: (amount: string) => `จะเปิดบิล ≈ ฿${amount}`,
    summarySale: (n: number) => `เปิดบิล ${n} ใบ`,
    summaryAdjust: (n: number) => `ปรับสต็อก ${n} รายการ`,
    summaryListing: (n: number) => `ลงร้านใหม่ ${n} ร้าน`,
  },
  en: {
    title: "Stock by shop",
    description:
      "Edit each shop's quantity here — the total below follows. Every change is recorded in the stock history.",
    selling: "Selling",
    notSelling: "Not listed",
    listHere: "List here",
    cancelListing: "Don't list",
    sellPrice: "Sell price",
    costPrice: "Cost",
    initialStock: "Starting stock",
    threshold: "Alert below",
    noteLabel: "Note (optional)",
    notePh: "e.g. monthly stock count",
    total: "Total stock",
    changes: (n: number) => `${n} change(s) to save`,
    noChanges: "Nothing changed yet",
    save: "Save",
    saving: "Saving…",
    close: "Close",
    noShops: "No shops yet",
    needPrice: "Shops you list need a sell price",
    defaultNote: "Adjusted from the catalog",
    defaultSaleNote: "Counter sale (recorded from the catalog)",
    reasonLabel: "Stock went down because",
    intentSale: "Sold",
    intentAdjust: "Correction",
    intentSaleHint: "Creates a real bill — dashboard revenue moves",
    intentAdjustHint: "Damaged, expired or recounted — not revenue",
    billPreview: (amount: string) => `Bill ≈ ฿${amount}`,
    summarySale: (n: number) => `${n} bill(s)`,
    summaryAdjust: (n: number) => `${n} correction(s)`,
    summaryListing: (n: number) => `${n} new listing(s)`,
  },
};

export function ShopStockDialog({
  product,
  shops,
  onClose,
}: ShopStockDialogProps) {
  const { locale } = useLocale();
  const t = content[locale];
  const queryClient = useQueryClient();

  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [intents, setIntents] = useState<Record<string, Intent>>({});
  const [listings, setListings] = useState<Record<string, NewListing>>({});
  const [note, setNote] = useState("");
  const [error, setError] = useState<ApiFailure | null>(null);
  const [saving, setSaving] = useState(false);

  const shopProductQueries = useQueries({
    queries: shops.map((shop) => ({
      queryKey: ["catalog", "shop-products", shop.id],
      queryFn: () =>
        api.get<{ items: ShopProductRow[] }>(
          withQuery(`/api/backend/shops/${shop.id}/products`, { limit: 100 }),
        ),
      enabled: product !== null,
    })),
  });

  /** shopId -> แถวของสินค้าตัวนี้ในร้านนั้น (เฉพาะที่ยัง ACTIVE) */
  const current = useMemo(() => {
    const map = new Map<string, ShopProductRow>();
    if (!product) return map;
    shopProductQueries.forEach((query, index) => {
      const shop = shops[index];
      if (!shop || !query.data) return;
      const row = query.data.items.find(
        (item) => item.productId === product.id && item.status === "ACTIVE",
      );
      if (row) map.set(shop.id, row);
    });
    return map;
  }, [shopProductQueries, shops, product]);

  /** ค่าเริ่มต้นเป็น "ขายไป" เพราะเป็นเคสที่พบบ่อยสุด แต่โชว์ตัวเลือกให้เห็นเสมอ
   *  ไม่แอบตัดสินใจแทน */
  const intentOf = (shopId: string): Intent => intents[shopId] ?? "sale";

  const valueOf = (shopId: string) => {
    const typed = quantities[shopId];
    if (typed !== undefined) return typed;
    return String(current.get(shopId)?.stockQty ?? 0);
  };

  const total = shops.reduce((sum, shop) => {
    if (current.has(shop.id)) return sum + (Number(valueOf(shop.id)) || 0);
    const listing = listings[shop.id];
    return listing ? sum + (Number(listing.stock) || 0) : sum;
  }, 0);

  const adjustments = shops.filter((shop) => {
    const row = current.get(shop.id);
    if (!row) return false;
    const next = Number(valueOf(shop.id));
    return Number.isFinite(next) && next >= 0 && next !== row.stockQty;
  });
  const newListings = shops.filter((shop) => listings[shop.id]);
  const deltaOf = (shopId: string) => {
    const row = current.get(shopId);
    if (!row) return 0;
    return Number(valueOf(shopId)) - row.stockQty;
  };
  const soldShops = adjustments.filter(
    (shop) => deltaOf(shop.id) < 0 && intentOf(shop.id) === "sale",
  );
  const changeCount = adjustments.length + newListings.length;
  const missingPrice = newListings.some(
    (shop) => !listings[shop.id]?.sellPrice.trim(),
  );

  const patchListing = (shopId: string, patch: Partial<NewListing>) =>
    setListings((previous) => ({
      ...previous,
      [shopId]: { ...(previous[shopId] ?? EMPTY_LISTING), ...patch },
    }));

  const dropListing = (shopId: string) =>
    setListings((previous) => {
      const next = { ...previous };
      delete next[shopId];
      return next;
    });

  const reset = () => {
    setQuantities({});
    setIntents({});
    setListings({});
    setNote("");
    setError(null);
  };

  const closeAll = () => {
    reset();
    onClose();
  };

  const onSave = async () => {
    if (!product || changeCount === 0 || missingPrice || saving) return;
    setError(null);
    setSaving(true);

    const reason = note.trim() || t.defaultNote;

    try {
      for (const shop of newListings) {
        const listing = listings[shop.id];
        if (!listing) continue;
        const created = await api.post<{ id: string }>(
          `/api/backend/shops/${shop.id}/products`,
          {
            productId: product.id,
            sellPrice: Number(listing.sellPrice),
            costPrice: Number(listing.costPrice || 0),
            lowStockThreshold: Number(listing.threshold || 0),
          },
        );
        const starting = Number(listing.stock || 0);
        if (starting > 0) {
          await api.post(`/api/backend/shops/${shop.id}/stock/adjust`, {
            shopProductId: created.id,
            operation: "INCREASE",
            quantity: starting,
            note: reason,
          });
        }
      }

      for (const shop of adjustments) {
        const row = current.get(shop.id);
        if (!row) continue;
        const delta = Number(valueOf(shop.id)) - row.stockQty;

        // ของที่ลดลงเพราะขายไป → เปิดบิลจริง เส้นนี้ตัดสต็อกให้เองแล้ว
        // ห้ามยิง stock/adjust ตามหลัง สต็อกจะถูกหักสองรอบ
        if (delta < 0 && intentOf(shop.id) === "sale") {
          await api.post(`/api/backend/shops/${shop.id}/sales`, {
            items: [{ shopProductId: row.id, quantity: -delta }],
            note: note.trim() || t.defaultSaleNote,
          });
          continue;
        }

        await api.post(`/api/backend/shops/${shop.id}/stock/adjust`, {
          shopProductId: row.id,
          operation: delta > 0 ? "INCREASE" : "DECREASE",
          quantity: Math.abs(delta),
          note: reason,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      // เปิดบิลแล้วยอดขาย/จำนวนบิล/เฉลี่ยต่อบิลบนแดชบอร์ดต้องขยับตาม
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      closeAll();
    } catch (caught) {
      setError(toApiFailure(caught));
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={product !== null}
      onOpenChange={(next) => {
        if (!next && !saving) closeAll();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t.title}
            {product && (
              <span className="ml-2 font-normal text-muted-foreground">
                — {product.name}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[26rem] overflow-y-auto rounded-xl border border-border">
          {shops.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t.noShops}
            </p>
          )}
          {shops.map((shop, index) => {
            const row = current.get(shop.id);
            const listing = listings[shop.id];
            return (
              <div
                key={shop.id}
                className={`px-4 py-3 ${
                  index < shops.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-semibold">
                      {shop.name}
                    </span>
                    <Badge variant={row ? "success" : "neutral"}>
                      {row ? t.selling : t.notSelling}
                    </Badge>
                  </span>

                  {row ? (
                    <span className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() =>
                          setQuantities((previous) => ({
                            ...previous,
                            [shop.id]: String(
                              Math.max(0, (Number(valueOf(shop.id)) || 0) - 1),
                            ),
                          }))
                        }
                      >
                        −1
                      </Button>
                      <Input
                        type="number"
                        min={0}
                        value={valueOf(shop.id)}
                        onChange={(event) =>
                          setQuantities((previous) => ({
                            ...previous,
                            [shop.id]: event.target.value,
                          }))
                        }
                        className="w-20 text-right font-mono"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() =>
                          setQuantities((previous) => ({
                            ...previous,
                            [shop.id]: String((Number(valueOf(shop.id)) || 0) + 1),
                          }))
                        }
                      >
                        +1
                      </Button>
                      {Number(valueOf(shop.id)) !== row.stockQty && (
                        <span className="ml-1 font-mono text-xs text-muted-foreground">
                          ({row.stockQty} →{" "}
                          {Number(valueOf(shop.id)) || 0})
                        </span>
                      )}
                    </span>
                  ) : listing ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => dropListing(shop.id)}
                    >
                      {t.cancelListing}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => patchListing(shop.id, {})}
                    >
                      {t.listHere}
                    </Button>
                  )}
                </div>

                {row && deltaOf(shop.id) < 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-muted/60 px-3 py-2">
                    <span className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                      {t.reasonLabel}
                    </span>
                    <span className="inline-flex gap-1 rounded-full bg-background p-0.5">
                      {(
                        [
                          ["sale", t.intentSale],
                          ["adjust", t.intentAdjust],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setIntents((previous) => ({
                              ...previous,
                              [shop.id]: value,
                            }))
                          }
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                            intentOf(shop.id) === value
                              ? "bg-foreground text-background"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {intentOf(shop.id) === "sale"
                        ? t.intentSaleHint
                        : t.intentAdjustHint}
                    </span>
                    {intentOf(shop.id) === "sale" && (
                      <span className="ml-auto font-mono text-[13px] font-semibold">
                        {t.billPreview(
                          (
                            Math.abs(deltaOf(shop.id)) * Number(row.sellPrice)
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }),
                        )}
                      </span>
                    )}
                  </div>
                )}

                {!row && listing && (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(
                      [
                        ["sellPrice", t.sellPrice, "0.01"],
                        ["costPrice", t.costPrice, "0.01"],
                        ["stock", t.initialStock, "1"],
                        ["threshold", t.threshold, "1"],
                      ] as const
                    ).map(([field, label, step]) => (
                      <label key={field} className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                          {label}
                        </span>
                        <Input
                          type="number"
                          min={0}
                          step={step}
                          value={listing[field]}
                          onChange={(event) =>
                            patchListing(shop.id, { [field]: event.target.value })
                          }
                          className="text-right font-mono"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {t.noteLabel}
          </span>
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t.notePh}
            maxLength={500}
          />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-2.5">
          <span className="text-[13px] text-muted-foreground">{t.total}</span>
          <span className="font-mono text-lg font-bold">
            {total.toLocaleString()}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {product?.unit}
            </span>
          </span>
        </div>

        {error && <ApiErrorNotice error={error} />}

        <DialogFooter>
          <span className="mr-auto self-center text-xs text-muted-foreground">
            {missingPrice
              ? t.needPrice
              : changeCount === 0
                ? t.noChanges
                : [
                    soldShops.length > 0 && t.summarySale(soldShops.length),
                    adjustments.length - soldShops.length > 0 &&
                      t.summaryAdjust(adjustments.length - soldShops.length),
                    newListings.length > 0 &&
                      t.summaryListing(newListings.length),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={closeAll}
          >
            {t.close}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="gradient"
            disabled={changeCount === 0 || missingPrice || saving}
            onClick={onSave}
          >
            {saving ? t.saving : t.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

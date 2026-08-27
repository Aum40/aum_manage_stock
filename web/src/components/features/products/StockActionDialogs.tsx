"use client";

import { useMemo, useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useLocale } from "@/components/i18n/LocaleContext";
import {
  ApiErrorNotice,
  toApiFailure,
  type ApiFailure,
} from "@/components/shared/ApiErrorNotice";
import { api, withQuery } from "@/lib/api-client";
import { inventoryKeys, type Shop, type ShopProduct } from "@/lib/hooks/use-inventory";

/**
 * สองการกระทำที่ปุ่ม +/− เดิมทำแทนไม่ได้ เพราะมันเปลี่ยนแค่จำนวนโดยไม่บอกสาเหตุ
 *
 * ขายออก — ยิง POST /shops/:id/sales ไม่ใช่ stock/adjust เพราะการขายต้องมีบิล
 * เส้นนี้สร้าง Sale + SaleItem + ตัดสต็อกให้เองผ่าน movementType 'SALE' ครบในทีเดียว
 * ห้ามยิง stock/adjust ตามหลัง สต็อกจะถูกหักสองรอบ ยอดคิดจาก sellPrice ปัจจุบัน
 *
 * ย้ายสต็อก — ยิง stock/adjust สองครั้ง (ลดร้านต้นทาง เพิ่มร้านปลายทาง) ทั้งคู่เป็น
 * MANUAL_ADJUSTMENT จึงไม่แตะยอดขายของร้านไหนเลย ตรงตามที่ควรเป็น ของแค่ย้ายที่
 * ไม่ได้ขาย
 *
 * ปรับสต็อก — รับของเข้า / ตัดของเสีย / แก้ตัวเลขให้ตรงกับที่นับได้จริง ยิง
 * stock/adjust ตรง ๆ ไม่ใช่การขาย จึงไม่แตะยอดรายได้
 *
 * ⚠️ การย้ายไม่ใช่ transaction — เป็นสองคำขอแยกกัน ถ้าขาที่สองล้มเหลว ของจะหาย
 * จากร้านต้นทางโดยไม่ไปถึงปลายทาง จึงมี compensating rollback คืนของกลับให้
 * อัตโนมัติ และถ้า rollback ล้มด้วยจะแจ้งเลขที่ต้องแก้มือให้ชัด
 * ทางแก้ที่ถูกจริงคือ endpoint /stock/transfer ฝั่ง api ที่ทำในทรานแซกชันเดียว
 * — เป็นของ feature/stock-movements-resource (พี่ดิว) ไม่ใช่ที่นี่
 */

type ShopProductRow = {
  id: string;
  productId: string;
  status: string;
  stockQty: number;
};

const content = {
  th: {
    sellTitle: "ขายออก",
    sellDesc:
      "บันทึกการขายที่ไม่ได้ผ่านหน้า POS — ระบบจะเปิดบิลจริงและตัดสต็อกให้",
    transferTitle: "ย้ายสต็อกไปอีกร้าน",
    transferDesc:
      "ของแค่ย้ายที่ ไม่ได้ขาย ยอดขายของทั้งสองร้านจึงไม่ขยับ",
    qty: "จำนวน",
    available: (n: number, unit: string) => `มีอยู่ ${n} ${unit}`,
    remaining: (n: number) => `เหลือ ${n}`,
    amount: "เป็นเงิน",
    destination: "ย้ายไปร้าน",
    pickShop: "เลือกร้านปลายทาง",
    noDestination:
      "ไม่มีร้านอื่นที่ขายสินค้าตัวนี้ — ต้องลงสินค้าเข้าร้านปลายทางก่อนถึงจะย้ายได้",
    confirmSell: "บันทึกการขาย",
    confirmTransfer: "ย้ายสต็อก",
    saving: "กำลังบันทึก…",
    cancel: "ยกเลิก",
    tooMany: "จำนวนเกินของที่มีอยู่",
    sellNote: "ขายหน้าร้าน (บันทึกจากหน้าสินค้า)",
    transferOut: (shop: string) => `ย้ายไป ${shop}`,
    transferIn: (shop: string) => `ย้ายมาจาก ${shop}`,
    rollbackDone:
      "ย้ายไม่สำเร็จ ระบบคืนของกลับร้านต้นทางให้แล้ว สต็อกไม่หายไปไหน",
    rollbackFailed: (n: number, shop: string) =>
      `ย้ายไม่สำเร็จ และคืนของกลับอัตโนมัติไม่ได้ด้วย — ${shop} ถูกหักไป ${n} แล้วแต่ปลายทางไม่ได้รับ กรุณาปรับคืนเองที่หน้านี้`,
    adjustTitle: "ปรับสต็อก",
    adjustDesc:
      "รับของเข้า ตัดของเสีย หรือแก้ตัวเลขให้ตรงกับที่นับได้จริง — ไม่นับเป็นยอดขาย",
    directionIn: "รับเข้า",
    directionOut: "ตัดออก",
    resulting: (n: number) => `จะเหลือ ${n}`,
    adjustNoteLabel: "หมายเหตุ (ไม่บังคับ)",
    adjustNotePh: "เช่น รับของจากซัพพลายเออร์ / ของหมดอายุ / นับสต็อกใหม่",
    confirmAdjust: "บันทึก",
    defaultAdjustNote: "ปรับจากหน้าสินค้า",
    negative: "ตัดออกมากกว่าของที่มีอยู่",
  },
  en: {
    sellTitle: "Record a sale",
    sellDesc:
      "For sales that did not go through POS — this creates a real bill and takes the stock out.",
    transferTitle: "Move stock to another shop",
    transferDesc:
      "Stock only changes place — neither shop's revenue moves.",
    qty: "Quantity",
    available: (n: number, unit: string) => `${n} ${unit} on hand`,
    remaining: (n: number) => `${n} left`,
    amount: "Amount",
    destination: "Move to",
    pickShop: "Pick a destination shop",
    noDestination:
      "No other shop sells this product yet — list it there first, then you can move stock.",
    confirmSell: "Record sale",
    confirmTransfer: "Move stock",
    saving: "Saving…",
    cancel: "Cancel",
    tooMany: "More than what is on hand",
    sellNote: "Counter sale (recorded from the products page)",
    transferOut: (shop: string) => `Moved to ${shop}`,
    transferIn: (shop: string) => `Moved from ${shop}`,
    rollbackDone:
      "The move failed and the stock was returned to the source shop. Nothing was lost.",
    rollbackFailed: (n: number, shop: string) =>
      `The move failed and the automatic rollback failed too — ${shop} is short by ${n} and the destination never received it. Please correct it manually here.`,
    adjustTitle: "Adjust stock",
    adjustDesc:
      "Receiving goods, writing off damage, or correcting the count — never counted as revenue.",
    directionIn: "Receive",
    directionOut: "Write off",
    resulting: (n: number) => `${n} after this`,
    adjustNoteLabel: "Note (optional)",
    adjustNotePh: "e.g. delivery from supplier / expired / recount",
    confirmAdjust: "Save",
    defaultAdjustNote: "Adjusted from the products page",
    negative: "More than what is on hand",
  },
};


/* ------------------------------------------------------------------ ขายออก */

export function SellStockDialog({
  row,
  shopId,
  onClose,
}: {
  row: ShopProduct | null;
  shopId: string | undefined;
  onClose: () => void;
}) {
  const { locale } = useLocale();
  const t = content[locale];
  const queryClient = useQueryClient();

  const [qty, setQty] = useState("1");
  const [error, setError] = useState<ApiFailure | null>(null);
  const [saving, setSaving] = useState(false);

  const amount = row ? Number(qty || 0) * Number(row.sellPrice) : 0;
  const quantity = Number(qty || 0);
  const tooMany = row ? quantity > row.stockQty : false;
  const canSubmit =
    row !== null && Number.isInteger(quantity) && quantity > 0 && !tooMany;

  const close = () => {
    setQty("1");
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (!row || !shopId || !canSubmit || saving) return;
    setError(null);
    setSaving(true);
    try {
      await api.post(`/api/backend/shops/${shopId}/sales`, {
        items: [{ shopProductId: row.id, quantity }],
        note: t.sellNote,
      });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      // เปิดบิลแล้วยอดขาย/จำนวนบิล/เฉลี่ยต่อบิลบนแดชบอร์ดต้องขยับตาม
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      close();
    } catch (caught) {
      setError(toApiFailure(caught));
      setSaving(false);
    }
  };

  return (
    <Dialog open={row !== null} onOpenChange={(next) => !next && !saving && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t.sellTitle}
            {row && (
              <span className="ml-2 font-normal text-muted-foreground">
                — {row.product.name}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>{t.sellDesc}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {t.qty}
          </span>
          <Input
            type="number"
            min={1}
            max={row?.stockQty}
            value={qty}
            autoFocus
            onChange={(event) => setQty(event.target.value)}
            className="text-right font-mono"
          />
          <span className="text-xs text-muted-foreground">
            {row ? t.available(row.stockQty, row.product.unit) : ""}
            {row && canSubmit
              ? ` · ${t.remaining(row.stockQty - quantity)}`
              : ""}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-2.5">
          <span className="text-[13px] text-muted-foreground">{t.amount}</span>
          <span className="font-mono text-lg font-bold">
            ฿
            {amount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        {(tooMany || error) && (
          <ApiErrorNotice error={error} fallback={t.tooMany} />
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" disabled={saving} onClick={close}>
            {t.cancel}
          </Button>
          <Button
            variant="gradient"
            size="sm"
            disabled={!canSubmit || saving}
            onClick={submit}
          >
            {saving ? t.saving : t.confirmSell}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------ ปรับสต็อก */

export function AdjustStockDialog({
  row,
  shopId,
  onClose,
}: {
  row: ShopProduct | null;
  shopId: string | undefined;
  onClose: () => void;
}) {
  const { locale } = useLocale();
  const t = content[locale];
  const queryClient = useQueryClient();

  const [direction, setDirection] = useState<"INCREASE" | "DECREASE">("INCREASE");
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");
  const [error, setError] = useState<ApiFailure | null>(null);
  const [saving, setSaving] = useState(false);

  const quantity = Number(qty || 0);
  const resulting = row
    ? row.stockQty + (direction === "INCREASE" ? quantity : -quantity)
    : 0;
  const negative = resulting < 0;
  const canSubmit =
    row !== null && Number.isInteger(quantity) && quantity > 0 && !negative;

  const close = () => {
    setDirection("INCREASE");
    setQty("1");
    setNote("");
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (!row || !shopId || !canSubmit || saving) return;
    setError(null);
    setSaving(true);
    try {
      await api.post(`/api/backend/shops/${shopId}/stock/adjust`, {
        shopProductId: row.id,
        operation: direction,
        quantity,
        note: note.trim() || t.defaultAdjustNote,
      });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      close();
    } catch (caught) {
      setError(toApiFailure(caught));
      setSaving(false);
    }
  };

  return (
    <Dialog open={row !== null} onOpenChange={(next) => !next && !saving && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t.adjustTitle}
            {row && (
              <span className="ml-2 font-normal text-muted-foreground">
                — {row.product.name}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>{t.adjustDesc}</DialogDescription>
        </DialogHeader>

        <span className="inline-flex w-fit gap-1 rounded-full bg-muted p-1">
          {(
            [
              ["INCREASE", t.directionIn],
              ["DECREASE", t.directionOut],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setDirection(value)}
              className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                direction === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </span>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {t.qty}
          </span>
          <Input
            type="number"
            min={1}
            value={qty}
            autoFocus
            onChange={(event) => setQty(event.target.value)}
            className="text-right font-mono"
          />
          <span className="text-xs text-muted-foreground">
            {row ? t.available(row.stockQty, row.product.unit) : ""}
            {row && quantity > 0 && !negative
              ? ` · ${t.resulting(resulting)}`
              : ""}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {t.adjustNoteLabel}
          </span>
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t.adjustNotePh}
            maxLength={500}
          />
        </div>

        {(negative || error) && (
          <ApiErrorNotice error={error} fallback={t.negative} />
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" disabled={saving} onClick={close}>
            {t.cancel}
          </Button>
          <Button
            variant="dark"
            size="sm"
            disabled={!canSubmit || saving}
            onClick={submit}
          >
            {saving ? t.saving : t.confirmAdjust}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------- ย้ายสต็อก */

export function TransferStockDialog({
  row,
  shopId,
  shops,
  onClose,
}: {
  row: ShopProduct | null;
  shopId: string | undefined;
  shops: Shop[];
  onClose: () => void;
}) {
  const { locale } = useLocale();
  const t = content[locale];
  const queryClient = useQueryClient();

  const [qty, setQty] = useState("1");
  const [destination, setDestination] = useState("");
  const [error, setError] = useState<ApiFailure | null>(null);
  const [saving, setSaving] = useState(false);

  const others = useMemo(
    () => shops.filter((shop) => shop.id !== shopId),
    [shops, shopId],
  );

  /** ปลายทางต้องมี shopProductId ของสินค้าตัวนี้อยู่แล้ว ถึงจะเพิ่มสต็อกให้ได้ */
  const destinationQueries = useQueries({
    queries: others.map((shop) => ({
      queryKey: ["catalog", "shop-products", shop.id],
      queryFn: () =>
        api.get<{ items: ShopProductRow[] }>(
          withQuery(`/api/backend/shops/${shop.id}/products`, { limit: 100 }),
        ),
      enabled: row !== null,
    })),
  });

  const candidates = useMemo(() => {
    const list: { shop: Shop; shopProductId: string }[] = [];
    if (!row) return list;
    destinationQueries.forEach((query, index) => {
      const shop = others[index];
      if (!shop || !query.data) return;
      const match = query.data.items.find(
        (item) =>
          item.productId === row.product.id && item.status === "ACTIVE",
      );
      if (match) list.push({ shop, shopProductId: match.id });
    });
    return list;
  }, [destinationQueries, others, row]);

  const picked = candidates.find((item) => item.shop.id === destination);
  const quantity = Number(qty || 0);
  const tooMany = row ? quantity > row.stockQty : false;
  const canSubmit =
    row !== null &&
    picked !== undefined &&
    Number.isInteger(quantity) &&
    quantity > 0 &&
    !tooMany;

  const close = () => {
    setQty("1");
    setDestination("");
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (!row || !shopId || !picked || !canSubmit || saving) return;
    setError(null);
    setSaving(true);

    const sourceName =
      shops.find((shop) => shop.id === shopId)?.name ?? "—";

    try {
      // ขาออกก่อน ถ้าขานี้ล้มก็จบ ไม่มีอะไรเสียหาย
      await api.post(`/api/backend/shops/${shopId}/stock/adjust`, {
        shopProductId: row.id,
        operation: "DECREASE",
        quantity,
        note: t.transferOut(picked.shop.name),
      });

      try {
        await api.post(`/api/backend/shops/${picked.shop.id}/stock/adjust`, {
          shopProductId: picked.shopProductId,
          operation: "INCREASE",
          quantity,
          note: t.transferIn(sourceName),
        });
      } catch (inbound) {
        // ขาเข้าล้ม — คืนของกลับต้นทางทันที ไม่งั้นสต็อกหายเฉย ๆ
        try {
          await api.post(`/api/backend/shops/${shopId}/stock/adjust`, {
            shopProductId: row.id,
            operation: "INCREASE",
            quantity,
            note: t.transferIn(picked.shop.name),
          });
          throw new Error(`${t.rollbackDone} (${toApiFailure(inbound).message})`);
        } catch {
          throw new Error(t.rollbackFailed(quantity, sourceName));
        }
      }

      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      close();
    } catch (caught) {
      setError(toApiFailure(caught));
      setSaving(false);
    }
  };

  return (
    <Dialog open={row !== null} onOpenChange={(next) => !next && !saving && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t.transferTitle}
            {row && (
              <span className="ml-2 font-normal text-muted-foreground">
                — {row.product.name}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>{t.transferDesc}</DialogDescription>
        </DialogHeader>

        {candidates.length === 0 ? (
          <p className="rounded-xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
            {t.noDestination}
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                {t.destination}
              </span>
              {/* Base UI ให้ <Select.Value /> แสดง "ค่า" ไม่ใช่ข้อความใน SelectItem
                  ถ้าใช้ตรง ๆ จะได้ UUID โผล่มา จึงเรนเดอร์ชื่อร้านเอง */}
              <Select
                value={destination}
                onValueChange={(value) => setDestination(String(value ?? ""))}
              >
                <SelectTrigger className="w-full">
                  <span className="flex-1 truncate text-left">
                    {picked?.shop.name ?? t.pickShop}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((item) => (
                    <SelectItem key={item.shop.id} value={item.shop.id}>
                      {item.shop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                {t.qty}
              </span>
              <Input
                type="number"
                min={1}
                max={row?.stockQty}
                value={qty}
                onChange={(event) => setQty(event.target.value)}
                className="text-right font-mono"
              />
              <span className="text-xs text-muted-foreground">
                {row ? t.available(row.stockQty, row.product.unit) : ""}
                {row && quantity > 0 && !tooMany
                  ? ` · ${t.remaining(row.stockQty - quantity)}`
                  : ""}
              </span>
            </div>
          </>
        )}

        {(tooMany || error) && (
          <ApiErrorNotice error={error} fallback={t.tooMany} />
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" disabled={saving} onClick={close}>
            {t.cancel}
          </Button>
          <Button
            variant="dark"
            size="sm"
            disabled={!canSubmit || saving}
            onClick={submit}
          >
            {saving ? t.saving : t.confirmTransfer}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

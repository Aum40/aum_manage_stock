"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useSelectedShop } from "@/components/shared/SelectedShopContext";
import { CategoryManagerDialog } from "@/components/shared/CategoryManagerDialog";
import BarcodeScanner from "@/components/features/barcode/BarcodeScanner";
import { ApiError, api } from "@/lib/api-client";
import {
  invalidateStockAndSales,
  useCategories,
  useCreateProduct,
  useMySubscription,
  useShops,
} from "@/lib/hooks/use-inventory";
import { useUploadImage } from "@/lib/hooks/use-uploads";

/**
 * [อั้ม] กล่องเพิ่มสินค้า — ทางเดียวที่สร้างสินค้าได้ในระบบ
 *
 * เดิมเป็นหน้าเต็ม /catalog/new ย้ายมาเป็น modal บนหน้าแคตตาล็อกกลาง เพราะการ
 * เพิ่มสินค้าต้องเห็นภาพรวมทุกร้านอยู่แล้ว การเด้งออกไปอีกหน้าทำให้หลุดบริบท
 *
 * เลย์เอาต์เป็นคอลัมน์เดียวเสมอ (ของเดิมเป็นสองคอลัมน์ ฟอร์ม + สรุปด้านขวา)
 * การ์ดสรุปกับโควตาจึงย้ายลงล่างสุด
 *
 * ลำดับที่ยิง api — สามขั้น เพราะข้อมูลอยู่คนละชั้นจริง ๆ
 *   1. POST /products                      สร้างในคลังกลาง 1 ครั้ง
 *   2. POST /shops/:id/products            ลงร้านที่เปิดสวิตช์ไว้ ทีละร้าน
 *   3. POST /shops/:id/stock/adjust        เฉพาะร้านที่ใส่สต็อกเริ่มต้นมากกว่า 0
 *
 * ขั้นที่ 3 แยกออกมาเพราะ shop_products.stockQty เริ่มที่ 0 เสมอโดยตั้งใจ
 * สต็อกเปลี่ยนได้ทางเดียวคือผ่าน stock movement เพื่อให้ประวัติไม่มีรูโหว่
 */
const UNIT_SUGGESTIONS = ["ชิ้น", "ขวด", "แพ็ก", "ห่อ", "กล่อง", "ถุง", "โหล", "กิโลกรัม"];
const MAX_UNIT_LENGTH = 20;

interface ShopRow {
  enabled: boolean;
  sellPrice: string;
  costPrice: string;
  stock: string;
  threshold: string;
}

/** ร้านที่ยังไม่ถูกแตะ — ปิดสวิตช์ไว้ */
const EMPTY_ROW: ShopRow = {
  enabled: false,
  sellPrice: "",
  costPrice: "",
  stock: "",
  threshold: "",
};

const ACTIVE_SHOP_ROW: ShopRow = { ...EMPTY_ROW, enabled: true };

const content = {
  th: {
    title: "เพิ่มสินค้าใหม่",
    card1Heading: "ข้อมูลสินค้า (ใช้ร่วมทุกร้าน)",
    card1Sub: "แก้ข้อมูลชุดนี้แล้วเปลี่ยนทุกร้านที่ขายสินค้าตัวนี้",
    name: "ชื่อสินค้า",
    namePh: "เช่น โค้กกระป๋อง 325 มล.",
    category: "หมวดหมู่",
    categoryNone: "ไม่ระบุ",
    newCategory: "จัดการหมวดหมู่",
    newCategoryPh: "ชื่อหมวดหมู่ เช่น ของสด",
    createCategory: "สร้าง",
    cancelCategory: "ยกเลิก",
    barcode: "บาร์โค้ด",
    barcodePh: "ห้ามซ้ำกับสินค้าอื่นของคุณ (เว้นว่างได้)",
    scanOpen: "สแกนแทนการพิมพ์",
    scanClose: "ปิดกล้อง",
    unit: "หน่วยนับ",
    unitPh: "เช่น ชิ้น",
    unitHint: "พิมพ์เองได้ หรือกดเลือกจากตัวอย่าง",
    image: "รูปสินค้า",
    imageHint: "JPG, PNG หรือ WebP ไม่เกิน 5 MB",
    imagePick: "เลือกรูป",
    imageChange: "เปลี่ยนรูป",
    imageRemove: "เอารูปออก",
    imageUploading: "กำลังอัปโหลด…",
    card2Heading: "ตั้งราคาและสต็อกรายร้าน",
    card2Sub: "เปิดสวิตช์ร้านที่จะขาย แล้วตั้งราคาต่างกันในแต่ละสาขาได้",
    noShops: "ยังไม่มีร้าน — สร้างร้านก่อนถึงจะลงขายได้",
    createShop: "ไปสร้างร้าน",
    priceLabel: "ราคาขาย",
    costLabel: "ต้นทุน",
    stockLabel: "สต็อกเริ่มต้น",
    alertLabel: "แจ้งเตือนเมื่อ",
    summaryTitle: "สรุปก่อนบันทึก",
    summaryShops: "ลงขาย",
    summaryShopsUnit: "ร้าน",
    summaryCatalogOnly: "เก็บในคลังกลางอย่างเดียว",
    summaryMargin: "กำไรต่อหน่วย",
    quotaTitle: "โควตาสินค้า",
    quotaOf: "จาก",
    unlimited: "ไม่จำกัด",
    quotaNote: "สินค้านี้นับเข้าโควตา 1 รายการ ไม่ว่าจะลงกี่ร้านก็ตาม",
    stockNote:
      "สต็อกเริ่มต้นจะถูกบันทึกเป็นรายการรับเข้าในประวัติสต็อก ไม่ใช่ตัวเลขที่ตั้งขึ้นมาลอย ๆ",
    saveBtn: "บันทึกสินค้า →",
    saving: "กำลังบันทึก…",
    cancelBtn: "ยกเลิก",
    required: "กรอกชื่อสินค้าและหน่วยนับก่อน",
    resumeHint:
      "สินค้าถูกสร้างไว้แล้ว การกดบันทึกอีกครั้งจะทำต่อเฉพาะร้านที่ยังไม่สำเร็จ ไม่สร้างสินค้าซ้ำ",
    requiredPrice: "ร้านที่เปิดสวิตช์ไว้ต้องใส่ราคาขาย",
  },
  en: {
    title: "Add New Product",
    card1Heading: "Product info (shared across shops)",
    card1Sub: "Changing these fields changes them at every shop selling this product.",
    name: "Product name",
    namePh: "e.g. Coke Can 325 ml.",
    category: "Category",
    categoryNone: "None",
    newCategory: "Manage categories",
    newCategoryPh: "Category name, e.g. Fresh food",
    createCategory: "Create",
    cancelCategory: "Cancel",
    barcode: "Barcode",
    barcodePh: "Must not clash with your other products (optional)",
    scanOpen: "Scan instead of typing",
    scanClose: "Close camera",
    unit: "Unit",
    unitPh: "e.g. piece",
    unitHint: "Type your own, or pick a suggestion",
    image: "Product image",
    imageHint: "JPG, PNG or WebP, up to 5 MB",
    imagePick: "Choose image",
    imageChange: "Change image",
    imageRemove: "Remove image",
    imageUploading: "Uploading…",
    card2Heading: "Per-shop price & stock",
    card2Sub: "Switch on the shops that sell it — each can carry its own price.",
    noShops: "No shop yet — create one before you can list a product.",
    createShop: "Create a shop",
    priceLabel: "Sell price",
    costLabel: "Cost",
    stockLabel: "Initial stock",
    alertLabel: "Alert at",
    summaryTitle: "Before you save",
    summaryShops: "Listing in",
    summaryShopsUnit: "shop(s)",
    summaryCatalogOnly: "Catalog only",
    summaryMargin: "Margin per unit",
    quotaTitle: "Product quota",
    quotaOf: "of",
    unlimited: "unlimited",
    quotaNote: "This counts as 1 against your quota no matter how many shops list it.",
    stockNote:
      "Initial stock is written as a stock-in entry in the history, not an arbitrary number.",
    saveBtn: "Save product →",
    saving: "Saving…",
    cancelBtn: "Cancel",
    required: "Fill in the product name and unit first",
    resumeHint:
      "The product was already created — saving again continues with the remaining shops instead of creating a duplicate.",
    requiredPrice: "Every switched-on shop needs a sell price",
  },
};

export default function AddProductDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { locale } = useLocale();
  const t = content[locale];
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [unit, setUnit] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [rows, setRows] = useState<Record<string, ShopRow>>({});
  const [error, setError] = useState<string | null>(null);
  /** ล้มหลังสร้างสินค้าไปแล้ว — ใช้เรนเดอร์คำอธิบาย จึงเป็น state ไม่ใช่ ref */
  const [partiallySaved, setPartiallySaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * ความคืบหน้าของการบันทึกรอบก่อน — ต้องอยู่ข้ามการกดซ้ำ
   *
   * การบันทึกหนึ่งครั้งคือหลายคำขอเรียงกัน (สร้างสินค้า → ลงทีละร้าน → ยิงสต็อก
   * เริ่มต้น) ไม่ใช่ทรานแซกชันเดียว ถ้าล้มที่ร้านที่สอง สินค้ากับร้านแรกถูกบันทึก
   * ไปแล้วจริง ๆ แต่ผู้ใช้เห็นแค่ error กับปุ่มที่กดซ้ำได้
   *
   * ถ้าไม่จำอะไรไว้ การกดซ้ำจะเรียก createProduct ใหม่ตั้งแต่ต้น ได้สินค้าซ้ำ
   * อีกแถวในแคตตาล็อกและกินโควตาเพิ่มอีกช่อง (products.service.ts นับ product
   * ต่อ ownerId ตรง ๆ) แพ็กเกจ Free มีแค่ 100 ช่อง
   *
   * useRef ไม่ใช่ useState เพราะค่าเหล่านี้ไม่ได้ใช้เรนเดอร์ และต้องอ่านได้ทันที
   * ในลูป async ที่กำลังทำงานอยู่ ไม่ใช่รอ re-render รอบถัดไป
   */
  const createdProductId = useRef<string | null>(null);
  const shopProgress = useRef(
    new Map<string, { shopProductId: string; stocked: boolean }>(),
  );

  const categoriesQuery = useCategories();
  const shopsQuery = useShops();
  const subscriptionQuery = useMySubscription();
  const createProduct = useCreateProduct();
  const uploadImage = useUploadImage();

  const shops = shopsQuery.data ?? [];
  const { selectedShopId } = useSelectedShop();
  const activeShopId =
    (selectedShopId && shops.some((shop) => shop.id === selectedShopId)
      ? selectedShopId
      : shops[0]?.id) ?? "";
  const quota = subscriptionQuery.data?.quotas.product;
  const categoryName =
    categoriesQuery.data?.find((category) => category.id === categoryId)?.name ??
    t.categoryNone;

  /**
   * ร้านที่กำลังใช้งานอยู่เปิดสวิตช์ไว้ให้ตั้งแต่แรก — คนส่วนใหญ่เพิ่มสินค้าเข้าร้าน
   * ที่ตัวเองดูอยู่ ไม่ใช่ลงคลังกลางเฉย ๆ
   *
   * ทำเป็น default ตอนอ่าน ไม่ใช่ seed ลง state ผ่าน useEffect เพราะรายชื่อร้าน
   * มาแบบ async ถ้า seed จะเขียนทับค่าที่ผู้ใช้เพิ่งกดปิดไปตอน query ตอบกลับมา
   */
  const rowOf = (shopId: string) =>
    rows[shopId] ?? (shopId === activeShopId ? ACTIVE_SHOP_ROW : EMPTY_ROW);
  const patchRow = (shopId: string, patch: Partial<ShopRow>) =>
    setRows((previous) => ({
      ...previous,
      [shopId]: { ...(previous[shopId] ?? EMPTY_ROW), ...patch },
    }));

  const enabledShops = shops.filter((shop) => rowOf(shop.id).enabled);
  const margin = (() => {
    const first = enabledShops[0];
    if (!first) return null;
    const row = rowOf(first.id);
    if (!row.sellPrice.trim() || !row.costPrice.trim()) return null;
    return Number(row.sellPrice) - Number(row.costPrice);
  })();


  const missingPrice = enabledShops.some(
    (shop) => !rowOf(shop.id).sellPrice.trim(),
  );
  const canSubmit =
    name.trim().length > 0 && unit.trim().length > 0 && !missingPrice;

  /**
   * ล้างฟอร์มให้หมดหลังบันทึกสำเร็จ
   *
   * **ต้องล้าง ref ทั้งสองตัวด้วย ไม่ใช่แค่ state** — createdProductId ถูกจำไว้เพื่อ
   * กันสร้างสินค้าซ้ำตอนกดบันทึกใหม่หลังพลาดกลางคัน ตอนเป็นหน้าเต็มมันหายเองเพราะ
   * เปลี่ยนหน้าแล้วคอมโพเนนต์ถูกถอด แต่ modal อยู่ในหน้าเดิมตลอด ถ้าไม่ล้าง สินค้า
   * ตัวถัดไปจะถูก "ลงร้าน" ทับ id ของสินค้าตัวก่อน = ได้สินค้าผิดตัวโดยไม่มีใครรู้
   */
  const resetForm = () => {
    setName("");
    setBarcode("");
    setUnit("");
    setCategoryId("");
    setImageUrl("");
    setRows({});
    setError(null);
    setPartiallySaved(false);
    setScanOpen(false);
    createdProductId.current = null;
    shopProgress.current = new Map();
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || saving) return;
    setError(null);
    setSaving(true);

    try {
      // รอบก่อนสร้างสินค้าไปแล้ว — ใช้ตัวเดิม ห้ามสร้างใหม่
      const productId =
        createdProductId.current ??
        (
          await createProduct.mutateAsync({
            name: name.trim(),
            unit: unit.trim(),
            barcode: barcode.trim() || undefined,
            categoryId: categoryId || undefined,
            imageUrl: imageUrl || undefined,
          })
        ).id;
      createdProductId.current = productId;

      for (const shop of enabledShops) {
        const row = rowOf(shop.id);

        // ลงร้านนี้แล้วหรือยัง — ยิงซ้ำจะโดน SHOP_PRODUCT_ALREADY_EXISTS
        let progress = shopProgress.current.get(shop.id);
        if (!progress) {
          const shopProduct = await api.post<{ id: string }>(
            `/api/backend/shops/${shop.id}/products`,
            {
              productId,
              sellPrice: Number(row.sellPrice),
              costPrice: Number(row.costPrice || 0),
              lowStockThreshold: Number(row.threshold || 0),
            },
          );
          progress = { shopProductId: shopProduct.id, stocked: false };
          shopProgress.current.set(shop.id, progress);
        }

        // แยกจากขั้นบน เพราะถ้ารอบก่อนลงร้านผ่านแต่ยิงสต็อกไม่ผ่าน
        // รอบนี้ต้องข้ามการลงร้านแล้วมายิงสต็อกอย่างเดียว
        const initialStock = Number(row.stock || 0);
        if (initialStock > 0 && !progress.stocked) {
          await api.post(`/api/backend/shops/${shop.id}/stock/adjust`, {
            shopProductId: progress.shopProductId,
            operation: "INCREASE",
            quantity: initialStock,
            note: locale === "th" ? "สต็อกเริ่มต้น" : "Initial stock",
          });
          progress.stocked = true;
        }
      }

      invalidateStockAndSales(queryClient);
      resetForm();
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : String(caught));
      setPartiallySaved(createdProductId.current !== null);
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // ปิดกลางคันแล้วเปิดใหม่ ต้องได้ฟอร์มเปล่า ไม่ใช่ของค้างจากรอบก่อน
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.card1Sub}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-1 items-start gap-5">
            <div className="flex flex-col gap-5">
              <Card>
                <div className="px-4">
                  <div className="font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                    {t.card1Heading}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{t.card1Sub}</p>
                </div>

                <div className="flex flex-col gap-4 px-4">
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] font-semibold tracking-[0.08em] uppercase">
                      {t.name}
                    </Label>
                    <Input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder={t.namePh}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <Label className="text-[11px] font-semibold tracking-[0.08em] uppercase">
                        {t.category}
                      </Label>
                      {/*
                        Base UI ให้ <Select.Value /> แสดง "ค่า" ที่เลือก ไม่ใช่ข้อความ
                        ใน <SelectItem> จึงเรนเดอร์ชื่อหมวดเองตรงนี้
                      */}
                      <Select
                        value={categoryId}
                        onValueChange={(value) => setCategoryId(String(value ?? ""))}
                      >
                        <SelectTrigger className="w-full">
                          <span className="flex-1 truncate text-left">
                            {categoryName}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">{t.categoryNone}</SelectItem>
                          {(categoriesQuery.data ?? []).map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <button
                        type="button"
                        onClick={() => setCategoryManagerOpen(true)}
                        className="mt-1 self-start text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                      >
                        {t.newCategory}
                      </button>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-[11px] font-semibold tracking-[0.08em] uppercase">
                          {t.barcode}
                        </Label>
                        {/* [อั้ม] สแกนแทนการพิมพ์ — เลข EAN-13 พิมพ์ผิดง่ายมาก */}
                        <button
                          type="button"
                          onClick={() => setScanOpen((open) => !open)}
                          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                        >
                          {scanOpen ? t.scanClose : t.scanOpen}
                        </button>
                      </div>
                      <Input
                        value={barcode}
                        onChange={(event) => setBarcode(event.target.value)}
                        placeholder={t.barcodePh}
                        className="font-mono"
                      />
                      {scanOpen && (
                        <div className="mt-1">
                          <BarcodeScanner
                            onScan={(value) => {
                              setBarcode(value);
                              setScanOpen(false);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] font-semibold tracking-[0.08em] uppercase">
                      {t.unit}
                    </Label>
                    <Input
                      value={unit}
                      onChange={(event) => setUnit(event.target.value)}
                      placeholder={t.unitPh}
                      maxLength={MAX_UNIT_LENGTH}
                      required
                    />
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {UNIT_SUGGESTIONS.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setUnit(suggestion)}
                          className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                            unit === suggestion
                              ? "bg-foreground text-background"
                              : "bg-muted text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{t.unitHint}</p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] font-semibold tracking-[0.08em] uppercase">
                      {t.image}
                    </Label>
                    <div className="flex flex-wrap items-center gap-4">
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt=""
                          className="size-24 shrink-0 rounded-xl object-cover ring-1 ring-border"
                        />
                      ) : (
                        <div className="flex size-24 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-border text-2xl">
                          🖼️
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              // ล้างค่าทันที ไม่งั้นเลือกไฟล์เดิมซ้ำจะไม่ยิง onChange
                              event.target.value = "";
                              if (!file) return;
                              setError(null);
                              uploadImage.mutate(
                                { file, folder: "products" },
                                {
                                  onSuccess: ({ url }) => setImageUrl(url),
                                  onError: (caught) =>
                                    setError(
                                      caught instanceof Error
                                        ? caught.message
                                        : String(caught),
                                    ),
                                },
                              );
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadImage.isPending}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            {uploadImage.isPending
                              ? t.imageUploading
                              : imageUrl
                                ? t.imageChange
                                : t.imagePick}
                          </Button>
                          {imageUrl && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setImageUrl("")}
                            >
                              {t.imageRemove}
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t.imageHint}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="px-4">
                  <div className="font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                    {t.card2Heading}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{t.card2Sub}</p>
                </div>

                <div className="px-4">
                  {shops.length === 0 ? (
                    <div className="flex flex-col items-start gap-3 py-6">
                      <p className="text-sm text-muted-foreground">{t.noShops}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        render={<Link href="/shops" />}
                      >
                        {t.createShop}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <div className="hidden gap-2 pb-2 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase sm:grid sm:grid-cols-[1fr_repeat(4,7rem)]">
                        <span />
                        <span className="text-right">{t.priceLabel}</span>
                        <span className="text-right">{t.costLabel}</span>
                        <span className="text-right">{t.stockLabel}</span>
                        <span className="text-right">{t.alertLabel}</span>
                      </div>

                      {shops.map((shop, index) => {
                        const row = rowOf(shop.id);
                        return (
                          <div
                            key={shop.id}
                            className={`grid grid-cols-1 items-center gap-2 py-3 sm:grid-cols-[1fr_repeat(4,7rem)] ${
                              index < shops.length - 1
                                ? "border-b border-border"
                                : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={row.enabled}
                                onCheckedChange={(checked) =>
                                  patchRow(shop.id, { enabled: Boolean(checked) })
                                }
                              />
                              <span className="min-w-0 truncate text-sm font-semibold">
                                {shop.name}
                              </span>
                            </div>

                            {(
                              [
                                ["sellPrice", t.priceLabel],
                                ["costPrice", t.costLabel],
                                ["stock", t.stockLabel],
                                ["threshold", t.alertLabel],
                              ] as const
                            ).map(([field, label]) => (
                              <Input
                                key={field}
                                aria-label={label}
                                type="number"
                                min={0}
                                step={field === "sellPrice" || field === "costPrice" ? "0.01" : "1"}
                                value={row[field]}
                                onChange={(event) =>
                                  patchRow(shop.id, { [field]: event.target.value })
                                }
                                /*
                                  บนมือถือแถวหัวตารางถูกซ่อน (hidden sm:grid) และ
                                  ช่องกรอกเรียงลงมาสี่ช่องติดกัน ถ้า placeholder เป็น "0"
                                  ทั้งสี่ช่อง ผู้ใช้จะไม่มีทางรู้เลยว่าช่องไหนคือราคา
                                  ช่องไหนคือสต็อก — ใช้ชื่อฟิลด์เป็น placeholder แทน
                                */
                                placeholder={label}
                                disabled={!row.enabled}
                                title={label}
                                className="text-right font-mono disabled:opacity-40"
                              />
                            ))}
                          </div>
                        );
                      })}

                      <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                        {t.stockNote}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <div className="flex flex-col gap-5">
              <Card>
                <div className="px-4 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                  {t.summaryTitle}
                </div>
                <div className="flex flex-col gap-2 px-4 text-[13px]">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-muted-foreground">{t.name}</span>
                    <span className="truncate text-right font-medium">
                      {name.trim() || "—"}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-muted-foreground">{t.unit}</span>
                    <span className="font-medium">{unit.trim() || "—"}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-muted-foreground">{t.category}</span>
                    <span className="truncate text-right font-medium">
                      {categoryName}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
                    <span className="text-muted-foreground">{t.summaryShops}</span>
                    <span className="text-right font-medium">
                      {enabledShops.length === 0
                        ? t.summaryCatalogOnly
                        : `${enabledShops.length} ${t.summaryShopsUnit}`}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-muted-foreground">{t.summaryMargin}</span>
                    <span
                      className={`font-mono font-semibold ${
                        margin !== null && margin < 0
                          ? "text-status-red"
                          : "text-foreground"
                      }`}
                    >
                      {margin === null ? "—" : `฿${margin.toLocaleString()}`}
                    </span>
                  </div>
                </div>
              </Card>

              {quota && (
                <Card>
                  <div className="px-4 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                    {t.quotaTitle}
                  </div>
                  <div className="px-4">
                    <div className="mb-2 font-mono text-lg font-bold">
                      {quota.used}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        {t.quotaOf} {quota.allowed ?? t.unlimited}
                      </span>
                    </div>
                    {quota.allowed !== null && (
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${Math.min(
                              (quota.used / Math.max(quota.allowed, 1)) * 100,
                              100,
                            )}%`,
                          }}
                        />
                      </div>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t.quotaNote}
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <p>{error}</p>
              {partiallySaved && (
                <p className="mt-1.5 text-[13px] opacity-90">{t.resumeHint}</p>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button type="submit" variant="gradient" disabled={!canSubmit || saving}>
              {saving ? t.saving : t.saveBtn}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              {t.cancelBtn}
            </Button>
            {!canSubmit && (
              <span className="text-xs text-muted-foreground">
                {missingPrice ? t.requiredPrice : t.required}
              </span>
            )}
          </div>
        </form>

        <CategoryManagerDialog
          open={categoryManagerOpen}
          onClose={() => setCategoryManagerOpen(false)}
          onCategoryDeleted={(deletedId) => {
            // ถ้าหมวดที่เลือกไว้ในฟอร์มถูกลบ ต้องเคลียร์ ไม่งั้นจะส่ง id ที่ไม่มีอยู่ไป api
            setCategoryId((current) => (current === deletedId ? "" : current));
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "@/components/ui/select";
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useSelectedShop } from "@/components/shared/SelectedShopContext";
import { ApiError, api } from "@/lib/api-client";
import {
  useAddShopProduct,
  useCategories,
  useCreateProduct,
  useMySubscription,
  useShops,
} from "@/lib/hooks/use-inventory";

/**
 * สินค้าอยู่ 2 ชั้นตามที่ api ออกแบบไว้
 *   1. คลังกลางของบัญชี  (POST /products)          — ชื่อ หน่วยนับ บาร์โค้ด หมวดหมู่
 *   2. สินค้าในร้าน       (POST /shops/:id/products) — ราคาขาย ต้นทุน จุดแจ้งเตือน
 *
 * ฟอร์มนี้ทำทั้งสองขั้นให้ในการกดครั้งเดียว ไม่งั้นผู้ใช้จะกดบันทึกแล้วไม่เห็น
 * สินค้าโผล่ในหน้า "สินค้าและสต็อก" เพราะหน้านั้นอ่านจากชั้นที่ 2
 *
 * หน่วยนับฝั่ง api รับสตริงอะไรก็ได้ยาวไม่เกิน 20 ตัว (product.dto.ts)
 * จึงเป็นช่องพิมพ์อิสระ ไม่ใช่ dropdown ที่ล็อกไว้ 4 ตัวเลือก
 */
const UNIT_SUGGESTIONS = ["ชิ้น", "ขวด", "แพ็ก", "ห่อ", "กล่อง", "ถุง", "โหล", "กิโลกรัม"];
const MAX_UNIT_LENGTH = 20;

const content = {
  th: {
    title: "เพิ่มสินค้าใหม่",
    heading: "ข้อมูลสินค้า",
    pricingHeading: "ราคาและสต็อกของร้าน",
    name: "ชื่อสินค้า",
    namePh: "เช่น โค้กกระป๋อง 325 มล.",
    category: "หมวดหมู่",
    categoryNone: "ไม่ระบุ",
    newCategory: "＋ สร้างหมวดหมู่ใหม่",
    newCategoryPh: "ชื่อหมวดหมู่ เช่น เครื่องดื่ม",
    createCategory: "สร้าง",
    cancelCategory: "ยกเลิก",
    barcode: "บาร์โค้ด",
    barcodePh: "สแกนหรือพิมพ์ (หากไม่มี เว้นว่าง)",
    unit: "หน่วยนับ",
    unitPh: "เช่น ชิ้น",
    unitHint: "พิมพ์เองได้ หรือกดเลือกจากตัวอย่างด้านล่าง",
    sellPrice: "ราคาขาย (บาท)",
    cost: "ต้นทุน (บาท)",
    alertThreshold: "จุดแจ้งเตือนสต็อกต่ำ",
    alertPh: "เช่น 24",
    alertHint: "เตือนเมื่อของเหลือถึงจำนวนนี้ ใส่ 0 ถ้าไม่ต้องการเตือน",
    addToShop: "ลงขายในร้านนี้เลย",
    addToShopHint: "ถ้าไม่เลือก สินค้าจะอยู่ในแคตตาล็อกกลางอย่างเดียว ยังไม่ขึ้นหน้าร้าน",
    image: "รูปสินค้า",
    imageSoon: "ยังอัปโหลดรูปไม่ได้",
    imageSoonHint:
      "ระบบหลังบ้านยังไม่มีเส้นทางอัปโหลดไฟล์ ทีมต้องตกลงกันก่อนว่าจะอัปผ่าน Cloudinary ตรงจากเว็บ หรือทำ endpoint ฝั่ง api",
    saveBtn: "บันทึกสินค้า →",
    saving: "กำลังบันทึก…",
    cancelBtn: "ยกเลิก",
    summaryTitle: "สรุปก่อนบันทึก",
    summaryShop: "ร้านที่จะลงขาย",
    summaryMargin: "กำไรต่อหน่วย",
    summaryNoShop: "ยังไม่มีร้าน",
    quotaTitle: "โควตาสินค้า",
    quotaOf: "จาก",
    unlimited: "ไม่จำกัด",
    howTitle: "สินค้าถูกเก็บ 2 ชั้น",
    howBody:
      "ชั้นแรกคือแคตตาล็อกกลางของบัญชี ใช้ร่วมกันได้ทุกสาขา ชั้นที่สองคือราคาขายกับสต็อกของแต่ละร้าน สินค้าตัวเดียวกันจึงตั้งคนละราคาในแต่ละสาขาได้ และถูกนับโควตาแค่ครั้งเดียว",
    required: "กรอกชื่อสินค้า หน่วยนับ และราคาขายก่อน",
    stockNote: "สต็อกเริ่มต้นที่ 0 เสมอ — เพิ่มของเข้าสต็อกได้ที่หน้าสินค้าและสต็อก หรือแชทบอท",
  },
  en: {
    title: "Add New Product",
    heading: "Product details",
    pricingHeading: "Shop price & stock",
    name: "Product name",
    namePh: "e.g. Coke Can 325 ml.",
    category: "Category",
    categoryNone: "None",
    newCategory: "＋ New category",
    newCategoryPh: "Category name, e.g. Drinks",
    createCategory: "Create",
    cancelCategory: "Cancel",
    barcode: "Barcode",
    barcodePh: "Scan or type (leave blank if none)",
    unit: "Unit",
    unitPh: "e.g. piece",
    unitHint: "Type your own, or pick one of the suggestions below",
    sellPrice: "Selling price (THB)",
    cost: "Cost (THB)",
    alertThreshold: "Low-stock alert threshold",
    alertPh: "e.g. 24",
    alertHint: "Warn when stock drops to this number. Use 0 to disable.",
    addToShop: "List it in this shop right away",
    addToShopHint:
      "If unchecked the product stays in the central catalog only and will not appear in the shop.",
    image: "Product image",
    imageSoon: "Image upload is not available yet",
    imageSoonHint:
      "The backend has no file-upload route yet — the team needs to decide between uploading to Cloudinary from the browser or adding an API endpoint.",
    saveBtn: "Save product →",
    saving: "Saving…",
    cancelBtn: "Cancel",
    summaryTitle: "Before you save",
    summaryShop: "Listing in",
    summaryMargin: "Margin per unit",
    summaryNoShop: "No shop yet",
    quotaTitle: "Product quota",
    quotaOf: "of",
    unlimited: "unlimited",
    howTitle: "Products live in two layers",
    howBody:
      "The first layer is your account-wide catalog, shared by every branch. The second is the per-shop price and stock, so the same product can carry different prices per branch while counting once against your quota.",
    required: "Fill in name, unit and selling price first",
    stockNote:
      "Stock always starts at 0 — add stock from the Products & Stock page or the chatbot.",
  },
};

export default function AddProductPage() {
  const { locale } = useLocale();
  const t = content[locale];
  const router = useRouter();

  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [unit, setUnit] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("");
  const [listInShop, setListInShop] = useState(true);
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const categoriesQuery = useCategories();
  const shopsQuery = useShops();
  const subscriptionQuery = useMySubscription();
  const { selectedShopId } = useSelectedShop();

  const shops = useMemo(() => shopsQuery.data ?? [], [shopsQuery.data]);
  const shopId =
    (selectedShopId && shops.some((shop) => shop.id === selectedShopId)
      ? selectedShopId
      : shops[0]?.id) ?? "";
  const shopName = shops.find((shop) => shop.id === shopId)?.name ?? t.summaryNoShop;
  const categoryName =
    categoriesQuery.data?.find((category) => category.id === categoryId)?.name ??
    t.categoryNone;

  const queryClient = useQueryClient();
  /**
   * หมวดหมู่เป็นของ CategoriesModule (อั้ม) — ตรงนี้แค่เรียก endpoint ของเขา
   * ไม่ได้แก้โค้ดโมดูลนั้น สร้างจากหน้านี้ได้เลยจะได้ไม่ต้องออกไปหน้าอื่นก่อน
   */
  const createCategory = useMutation({
    mutationFn: (name: string) =>
      api.post<{ id: string; name: string }>("/api/backend/categories", { name }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setCategoryId(created.id);
      setNewCategoryOpen(false);
      setNewCategoryName("");
    },
  });

  const createProduct = useCreateProduct();
  const addShopProduct = useAddShopProduct(shopId);
  const isSaving = createProduct.isPending || addShopProduct.isPending;

  const willList = listInShop && shopId !== "";
  const canSubmit =
    name.trim().length > 0 &&
    unit.trim().length > 0 &&
    (!willList || sellPrice.trim().length > 0);

  const margin =
    sellPrice.trim() && costPrice.trim()
      ? Number(sellPrice) - Number(costPrice)
      : null;

  const quota = subscriptionQuery.data?.quotas.product;

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || isSaving) return;
    setError(null);

    try {
      const product = await createProduct.mutateAsync({
        name: name.trim(),
        unit: unit.trim(),
        barcode: barcode.trim() || undefined,
        categoryId: categoryId || undefined,
      });

      if (willList) {
        await addShopProduct.mutateAsync({
          productId: product.id,
          sellPrice: Number(sellPrice),
          costPrice: Number(costPrice || 0),
          lowStockThreshold: Number(lowStockThreshold || 0),
        });
        router.push("/products");
      } else {
        router.push("/catalog");
      }
    } catch (caught) {
      // ข้อความจาก api ถูกแปลเป็นไทยแล้วใน resolveApiError
      setError(
        caught instanceof ApiError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : String(caught),
      );
    }
  };

  return (
    <>
      <TopBar title={t.title} user={roleAvatar.owner[locale]} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-5">
              <Card>
                <div className="px-4 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                  {t.heading}
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
                        ใน <SelectItem> จึงต้องเรนเดอร์ชื่อเองตรงนี้ ไม่งั้นจะได้ UUID
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
                          {categoriesQuery.data?.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {newCategoryOpen ? (
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Input
                            value={newCategoryName}
                            onChange={(event) =>
                              setNewCategoryName(event.target.value)
                            }
                            placeholder={t.newCategoryPh}
                            className="min-w-40 flex-1"
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled={
                              !newCategoryName.trim() || createCategory.isPending
                            }
                            onClick={() =>
                              createCategory.mutate(newCategoryName.trim())
                            }
                          >
                            {t.createCategory}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setNewCategoryOpen(false)}
                          >
                            {t.cancelCategory}
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setNewCategoryOpen(true)}
                          className="mt-1 self-start text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                        >
                          {t.newCategory}
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <Label className="text-[11px] font-semibold tracking-[0.08em] uppercase">
                        {t.barcode}
                      </Label>
                      <Input
                        value={barcode}
                        onChange={(event) => setBarcode(event.target.value)}
                        placeholder={t.barcodePh}
                        className="font-mono"
                      />
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
                </div>
              </Card>

              <Card>
                <div className="flex flex-wrap items-baseline justify-between gap-2 px-4">
                  <div className="font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                    {t.pricingHeading}
                  </div>
                  <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={listInShop}
                      disabled={shopId === ""}
                      onChange={(event) => setListInShop(event.target.checked)}
                      className="size-4 accent-[var(--color-brand-orange)]"
                    />
                    {t.addToShop}
                  </label>
                </div>

                <div className="flex flex-col gap-4 px-4">
                  <p className="text-xs text-muted-foreground">{t.addToShopHint}</p>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <Label className="text-[11px] font-semibold tracking-[0.08em] uppercase">
                        {t.sellPrice}
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={sellPrice}
                        onChange={(event) => setSellPrice(event.target.value)}
                        placeholder="0.00"
                        disabled={!willList}
                        required={willList}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-[11px] font-semibold tracking-[0.08em] uppercase">
                        {t.cost}
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={costPrice}
                        onChange={(event) => setCostPrice(event.target.value)}
                        placeholder="0.00"
                        disabled={!willList}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 sm:max-w-[calc(50%-0.5rem)]">
                    <Label className="text-[11px] font-semibold tracking-[0.08em] uppercase">
                      {t.alertThreshold}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={lowStockThreshold}
                      onChange={(event) => setLowStockThreshold(event.target.value)}
                      placeholder={t.alertPh}
                      disabled={!willList}
                    />
                    <p className="text-xs text-muted-foreground">{t.alertHint}</p>
                  </div>

                  <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                    {t.stockNote}
                  </p>
                </div>
              </Card>

              <Card>
                <div className="px-4 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                  {t.image}
                </div>
                <div className="px-4">
                  <div className="rounded-2xl border-2 border-dashed border-border px-5 py-6 text-center">
                    <div className="mb-1 text-sm font-semibold text-foreground">
                      {t.imageSoon}
                    </div>
                    <p className="mx-auto max-w-md text-xs text-muted-foreground">
                      {t.imageSoonHint}
                    </p>
                  </div>
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
                    <span className="text-muted-foreground">{t.summaryShop}</span>
                    <span className="truncate text-right font-medium">
                      {willList ? shopName : "—"}
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
                    {/* allowed = null แปลว่าไม่จำกัด (แพ็กเกจที่ไม่ตั้งเพดาน) จึงไม่มีแถบให้วัด */}
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
                  </div>
                </Card>
              )}

              <Card>
                <div className="px-4 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                  {t.howTitle}
                </div>
                <p className="px-4 text-[13px] leading-relaxed text-muted-foreground">
                  {t.howBody}
                </p>
              </Card>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button type="submit" variant="gradient" disabled={!canSubmit || isSaving}>
              {isSaving ? t.saving : t.saveBtn}
            </Button>
            <Button variant="ghost" render={<Link href="/products" />}>
              {t.cancelBtn}
            </Button>
            {!canSubmit && (
              <span className="text-xs text-muted-foreground">{t.required}</span>
            )}
          </div>
        </form>
      </main>
    </>
  );
}

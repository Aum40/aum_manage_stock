"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useAddShopProduct, useAdjustStock, useProducts, useShopProducts, useShops } from "@/lib/hooks/use-inventory";
import { useSelectedShop } from "@/components/shared/SelectedShopContext";

const content = {
  th: { title: "เพิ่มสินค้าเข้าร้าน", intro: "เลือกสินค้าจากแคตตาล็อกกลางมาขายที่", end: "แล้วตั้งราคาและสต็อกเริ่มต้นของร้านนี้", search: "ค้นหาสินค้าในแคตตาล็อก…", product: "สินค้า", price: "ราคาขาย", stock: "สต็อกเริ่มต้น", selling: "ขายอยู่แล้ว", selected: (n: number) => `เลือกแล้ว ${n} รายการ`, add: "เพิ่มเข้าร้าน →", cancel: "ยกเลิก", empty: "ยังไม่มีสินค้าในแคตตาล็อก", loading: "กำลังโหลด...", noShop: "ยังไม่มีร้านค้า" },
  en: { title: "Add Product to Shop", intro: "Select products from the central catalog to sell at", end: ", then set this shop's starting price and stock.", search: "Search products in catalog…", product: "Product", price: "Sell Price", stock: "Initial Stock", selling: "Already selling", selected: (n: number) => `${n} selected`, add: "Add to Shop →", cancel: "Cancel", empty: "No products in the catalog", loading: "Loading...", noShop: "No shop found" },
};

type Selection = { checked: boolean; price: string; stock: string };

const EMPTY_SELECTION: Selection = { checked: false, price: "", stock: "" };

export default function SelectProductForShopPage() {
  const { locale } = useLocale();
  const t = content[locale];
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selections, setSelections] = useState<Record<string, Selection>>({});
  const shopsQuery = useShops();
  const shops = shopsQuery.data ?? [];
  const { selectedShopId } = useSelectedShop();
  // ร้านที่เคยเลือกอาจถูกลบไปแล้ว — ตกกลับไปร้านแรกเหมือนที่ (main)/layout.tsx ทำ
  const shopId =
    selectedShopId && shops.some((shop) => shop.id === selectedShopId)
      ? selectedShopId
      : shops[0]?.id;
  const productsQuery = useProducts({ q: search || undefined, limit: 100 });
  const shopProductsQuery = useShopProducts(shopId, { limit: 100 });
  const addProduct = useAddShopProduct(shopId);
  const adjustStock = useAdjustStock(shopId);
  // ต้อง useMemo ไม่งั้น `?? []` สร้าง array ใหม่ทุก render ระหว่างที่ query ยังโหลดไม่เสร็จ
  const products = useMemo(() => productsQuery.data?.items ?? [], [productsQuery.data]);
  const sellingIds = useMemo(() => new Set((shopProductsQuery.data?.items ?? []).map((item) => item.productId)), [shopProductsQuery.data]);

  // ไม่ต้อง seed ค่าเริ่มต้นของทุกสินค้าลง state ผ่าน effect — ตอน render อ่านผ่าน
  // EMPTY_SELECTION อยู่แล้ว แถวไหนยังไม่ถูกแตะก็ไม่ต้องมีอยู่ใน state ตั้งแต่แรก

  const selectedCount = products.filter((product) => selections[product.id]?.checked && !sellingIds.has(product.id)).length;
  const setSelection = (id: string, patch: Partial<Selection>) => setSelections((previous) => ({ ...previous, [id]: { ...(previous[id] ?? EMPTY_SELECTION), ...patch } }));
  const handleAdd = async () => {
    if (!shopId) return;
    for (const product of products.filter((item) => selections[item.id]?.checked && !sellingIds.has(item.id))) {
      const selection = selections[product.id];
      if (!selection || Number(selection.price) <= 0) continue;
      const created = await addProduct.mutateAsync({ productId: product.id, sellPrice: Number(selection.price), costPrice: 0, lowStockThreshold: 0 }) as { id: string };
      if (Number(selection.stock) > 0) await adjustStock.mutateAsync({ shopProductId: created.id, operation: "INCREASE", quantity: Number(selection.stock), note: "Initial stock" });
    }
    router.push("/products");
  };

  return <><TopBar title={t.title} /><main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8"><div className="flex flex-col gap-5">
    <div className="text-sm text-muted-foreground">{t.intro} <strong className="text-foreground">{shops.find((shop) => shop.id === shopId)?.name ?? t.noShop}</strong>{t.end}</div>
    <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.search} className="max-w-sm" />
    <Card className="overflow-x-auto p-0"><table className="w-full min-w-125 border-collapse text-sm"><thead><tr className="border-b border-border"><th className="w-10 px-5 py-3" /><th className="px-5 py-3 text-left text-xs font-medium tracking-[0.05em] text-muted-foreground uppercase">{t.product}</th><th className="px-4 py-3 text-right text-xs font-medium tracking-[0.05em] text-muted-foreground uppercase">{t.price}</th><th className="px-4 py-3 text-right text-xs font-medium tracking-[0.05em] text-muted-foreground uppercase">{t.stock}</th></tr></thead><tbody>
      {products.map((product) => { const item = selections[product.id] ?? EMPTY_SELECTION; const alreadySelling = sellingIds.has(product.id); return <tr key={product.id} className="border-b border-border last:border-0"><td className="px-5 py-3.5">{alreadySelling ? <Badge variant="neutral">{t.selling}</Badge> : <input type="checkbox" checked={item.checked} onChange={(event) => setSelection(product.id, { checked: event.target.checked })} className="size-4 accent-primary" />}</td><td className="px-5 py-3.5"><div className="font-medium">{product.name}</div><div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{product.barcode ?? product.unit}</div></td><td className="px-4 py-3.5"><Input value={item.price} onChange={(event) => setSelection(product.id, { price: event.target.value })} disabled={!item.checked || alreadySelling} className="w-20 text-right font-mono" /></td><td className="px-4 py-3.5"><Input value={item.stock} onChange={(event) => setSelection(product.id, { stock: event.target.value })} disabled={!item.checked || alreadySelling} className="w-20 text-right font-mono" /></td></tr>; })}
      {(productsQuery.isLoading || shopProductsQuery.isLoading) && <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">{t.loading}</td></tr>}{!productsQuery.isLoading && products.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">{t.empty}</td></tr>}
    </tbody></table><div className="flex items-center justify-between rounded-b-3xl bg-secondary px-5 py-3.5"><span className="text-[13px] text-muted-foreground">{t.selected(selectedCount)}</span><div className="flex gap-2.5"><Button variant="gradient" size="sm" disabled={!shopId || selectedCount === 0 || addProduct.isPending} onClick={handleAdd}>{t.add}</Button><Button variant="ghost" size="sm" render={<Link href="/catalog" />}>{t.cancel}</Button></div></div></Card>
  </div></main></>;
}

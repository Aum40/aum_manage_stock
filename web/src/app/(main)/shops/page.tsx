"use client";

import TopBar from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Caption from "@/components/shared/Caption";
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useShops } from "@/lib/hooks/use-inventory";

const content = {
  th: {
    title: "ร้านค้าของฉัน",
    quotaText: (used: number, total: number) => (
      <>
        ใช้สิทธิ์สร้างร้านไป <strong className="text-foreground">{used} จาก {total} ร้าน</strong>{" "}
        ตามแพ็กเกจปัจจุบัน
      </>
    ),
    buyMoreBtn: "ซื้อสิทธิ์ร้านเพิ่ม",
    viewShopBtn: "เข้าดูร้าน →",
    editBtn: "แก้ไข",
    deleteBtn: "ลบ",
    createNew: "สร้างร้านใหม่",
    remainingSlot: "เหลือสิทธิ์อีก 1 ร้าน",
    caption:
      "การสร้าง แก้ไข ลบ และการจัดการบัญชีพนักงานเข้าถึงสิทธิ์ เฉพาะเจ้าของร้านเท่านั้น การลบร้านจะยังคงสิทธิ์ quota ให้กับบัญชี",
    shops: [
      { initial: "ล", name: "อุ้มมินิมาร์ท สาขาลาดพร้าว", meta: "พนักงาน 2 คน · สินค้า 312 รายการ", avatarBg: "#F5A31C" },
      { initial: "บ", name: "อุ้มมินิมาร์ท สาขาบางนา", meta: "พนักงาน 1 คน · สินค้า 178 รายการ", avatarBg: "#5C9A54" },
    ],
    activeLabel: "เปิดใช้งาน",
  },
  en: {
    title: "My Shops",
    quotaText: (used: number, total: number) => (
      <>
        You&apos;ve used <strong className="text-foreground">{used} of {total} shop slots</strong>{" "}
        on your current plan.
      </>
    ),
    buyMoreBtn: "Buy More Shop Slots",
    viewShopBtn: "Open Shop →",
    editBtn: "Edit",
    deleteBtn: "Delete",
    createNew: "Create New Shop",
    remainingSlot: "1 shop slot remaining",
    caption:
      "Creating, editing, deleting shops, and managing staff access are all owner-only. Deleting a shop still keeps its quota slot on your account.",
    shops: [
      { initial: "L", name: "Aum Minimart — Lat Phrao", meta: "2 staff · 312 products", avatarBg: "#F5A31C" },
      { initial: "B", name: "Aum Minimart — Bang Na", meta: "1 staff · 178 products", avatarBg: "#5C9A54" },
    ],
    activeLabel: "Active",
  },
};

export default function MyShopsPage() {
  const { locale } = useLocale();
  const t = content[locale];
  const shopsQuery = useShops();
  const shops = shopsQuery.data ?? [];

  return (
    <>
      <TopBar title={t.title} user={roleAvatar.owner[locale]} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t.quotaText(2, 3)}
            </span>
            <Button variant="outline">{t.buyMoreBtn}</Button>
          </div>

          <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
            {shopsQuery.isLoading && (
              <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
                กำลังโหลดข้อมูลร้านค้า…
              </div>
            )}
            {!shopsQuery.isLoading && shops.length === 0 && (
              <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
                ยังไม่มีร้านค้า
              </div>
            )}
            {shops.map((s, i) => (
              <Card key={s.id}>
                <div className="px-4">
                  <div className="mb-3.5 flex items-start justify-between">
                    <div
                      className="flex size-12 items-center justify-center rounded-2xl font-heading text-xl font-bold text-white"
                      style={{ backgroundColor: i % 2 === 0 ? "#F5A31C" : "#5C9A54" }}
                    >
                      {s.name.charAt(0)}
                    </div>
                    <Badge variant="success">{t.activeLabel}</Badge>
                  </div>
                  <div className="mb-1 font-heading text-base font-bold text-foreground">
                    {s.name}
                  </div>
                  <div className="mb-4 text-[13px] text-muted-foreground">
                    {s.address || "ร้านค้าของฉัน"}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Button variant="dark" size="sm">
                      {t.viewShopBtn}
                    </Button>
                    <button className="text-[13px] text-muted-foreground">
                      {t.editBtn}
                    </button>
                    <button className="text-[13px] text-destructive">
                      {t.deleteBtn}
                    </button>
                  </div>
                </div>
              </Card>
            ))}

            <div className="flex min-h-40 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border p-6 text-center">
              <div className="mb-2 text-4xl leading-none font-bold text-primary">
                +
              </div>
              <div className="mb-1 font-heading text-base font-bold text-foreground">
                {t.createNew}
              </div>
              <div className="text-[13px] text-muted-foreground">
                {t.remainingSlot}
              </div>
            </div>
          </div>

          <Caption>{t.caption}</Caption>
        </div>
      </main>
    </>
  );
}

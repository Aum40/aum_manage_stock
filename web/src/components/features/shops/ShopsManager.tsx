"use client";

import { useState } from "react";
import Link from "next/link";

import TopBar from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Caption from "@/components/shared/Caption";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ShopFormDialog } from "@/components/features/shops/ShopFormDialog";
import { useSelectedShop } from "@/components/shared/SelectedShopContext";
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";
import { ApiError } from "@/lib/api-client";
import {
  useDeleteShop,
  useMySubscription,
  useShops,
  type Shop,
} from "@/lib/hooks/use-inventory";

const content = {
  th: {
    title: "ร้านค้าของฉัน",
    quotaText: (used: number, total: number) => (
      <>
        ใช้สิทธิ์สร้างร้านไป <strong className="text-foreground">{used} จาก {total} ร้าน</strong>{" "}
        ตามแพ็กเกจปัจจุบัน
      </>
    ),
    viewShopBtn: "เข้าดูร้าน →",
    editBtn: "แก้ไข",
    deleteBtn: "ลบ",
    createNew: "สร้างร้านใหม่",
    remainingSlot: (n: number) => `เหลือสิทธิ์อีก ${n} ร้าน`,
    quotaFullNote: "สิทธิ์สร้างร้านเต็มแล้ว อัปเกรดแพ็กเกจเพื่อสร้างร้านเพิ่ม",
    readOnlyNote: "แพ็กเกจหมดอายุ — สร้าง/แก้ไข/ลบร้านไม่ได้จนกว่าจะต่ออายุ",
    caption:
      "การสร้าง แก้ไข ลบ และการจัดการบัญชีพนักงานเข้าถึงสิทธิ์ เฉพาะเจ้าของร้านเท่านั้น การลบร้านจะยังคงสิทธิ์ quota ให้กับบัญชี",
    activeLabel: "เปิดใช้งาน",
    loading: "กำลังโหลดข้อมูลร้านค้า…",
    empty: "ยังไม่มีร้านค้า",
    noAddress: "ร้านค้าของฉัน",
    confirmDeleteTitle: "ลบร้านนี้?",
    confirmDeleteDesc: (name: string) => `ร้าน "${name}" จะถูกลบออกจากบัญชี ประวัติการขายและสต็อกยังเก็บไว้เหมือนเดิม`,
    confirmCancel: "ยกเลิก",
    confirmDelete: "ลบร้าน",
    confirmDeleting: "กำลังลบ…",
    confirmDeleted: "ลบสำเร็จ",
    deleteError: "ลบร้านไม่สำเร็จ",
  },
  en: {
    title: "My Shops",
    quotaText: (used: number, total: number) => (
      <>
        You&apos;ve used <strong className="text-foreground">{used} of {total} shop slots</strong>{" "}
        on your current plan.
      </>
    ),
    viewShopBtn: "Open Shop →",
    editBtn: "Edit",
    deleteBtn: "Delete",
    createNew: "Create New Shop",
    remainingSlot: (n: number) => `${n} shop slots remaining`,
    quotaFullNote: "Shop quota is full — upgrade your plan to create more shops.",
    readOnlyNote: "Subscription expired — creating, editing, and deleting shops is disabled until you renew.",
    caption:
      "Creating, editing, deleting shops, and managing staff access are all owner-only. Deleting a shop still keeps its quota slot on your account.",
    activeLabel: "Active",
    loading: "Loading shops…",
    empty: "No shops yet",
    noAddress: "My shop",
    confirmDeleteTitle: "Delete this shop?",
    confirmDeleteDesc: (name: string) => `"${name}" will be removed from your account. Its sales and stock history are kept.`,
    confirmCancel: "Cancel",
    confirmDelete: "Delete shop",
    confirmDeleting: "Deleting…",
    confirmDeleted: "Deleted",
    deleteError: "Failed to delete the shop",
  },
};

function toMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export default function ShopsManager() {
  const { locale } = useLocale();
  const t = content[locale];
  const shopsQuery = useShops();
  const subscriptionQuery = useMySubscription();
  const deleteShop = useDeleteShop();
  const { setSelectedShopId } = useSelectedShop();

  const [formState, setFormState] = useState<{ open: boolean; shop: Shop | null }>({
    open: false,
    shop: null,
  });
  const [shopPendingDelete, setShopPendingDelete] = useState<Shop | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const shops = shopsQuery.data ?? [];
  const quota = subscriptionQuery.data?.quotas.shop;
  const readOnly = subscriptionQuery.data?.readOnly ?? false;
  const canCreate = (quota?.canCreateShop ?? true) && !readOnly;

  const openCreate = () => setFormState({ open: true, shop: null });
  const openEdit = (shop: Shop) => setFormState({ open: true, shop });

  const onConfirmDelete = async (): Promise<boolean> => {
    if (!shopPendingDelete) return false;
    setDeleteError(null);

    try {
      await deleteShop.mutateAsync(shopPendingDelete.id);
      return true;
    } catch (error) {
      setDeleteError(toMessage(error, t.deleteError));
      return false;
    }
  };

  return (
    <>
      <TopBar title={t.title} user={roleAvatar.owner[locale]} readOnly={readOnly} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t.quotaText(quota?.used ?? 0, quota?.allowed ?? 0)}
            </span>
          </div>

          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}

          <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
            {shopsQuery.isLoading && (
              <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
                {t.loading}
              </div>
            )}
            {!shopsQuery.isLoading && shops.length === 0 && (
              <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
                {t.empty}
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
                    {s.address || t.noAddress}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Button
                      variant="dark"
                      size="sm"
                      render={<Link href="/dashboard" />}
                      onClick={() => setSelectedShopId(s.id)}
                    >
                      {t.viewShopBtn}
                    </Button>
                    <button
                      type="button"
                      className="text-[13px] text-muted-foreground"
                      onClick={() => openEdit(s)}
                    >
                      {t.editBtn}
                    </button>
                    <button
                      type="button"
                      className="text-[13px] text-destructive"
                      onClick={() => {
                        setDeleteError(null);
                        setShopPendingDelete(s);
                      }}
                    >
                      {t.deleteBtn}
                    </button>
                  </div>
                </div>
              </Card>
            ))}

            <button
              type="button"
              disabled={!canCreate}
              onClick={openCreate}
              title={readOnly ? t.readOnlyNote : !canCreate ? t.quotaFullNote : undefined}
              className="flex min-h-40 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border p-6 text-center disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="mb-2 text-4xl leading-none font-bold text-primary">
                +
              </div>
              <div className="mb-1 font-heading text-base font-bold text-foreground">
                {t.createNew}
              </div>
              <div className="text-[13px] text-muted-foreground">
                {readOnly ? t.readOnlyNote : t.remainingSlot(quota?.remaining ?? 0)}
              </div>
            </button>
          </div>

          <Caption>{t.caption}</Caption>
        </div>
      </main>

      <ShopFormDialog
        open={formState.open}
        shop={formState.shop}
        onOpenChange={(open) => setFormState((prev) => ({ ...prev, open }))}
      />

      <ConfirmDialog
        open={shopPendingDelete !== null}
        title={t.confirmDeleteTitle}
        description={shopPendingDelete ? t.confirmDeleteDesc(shopPendingDelete.name) : undefined}
        cancelLabel={t.confirmCancel}
        confirmLabel={t.confirmDelete}
        pendingLabel={t.confirmDeleting}
        successLabel={t.confirmDeleted}
        destructive
        onConfirm={onConfirmDelete}
        onClose={() => setShopPendingDelete(null)}
      />
    </>
  );
}

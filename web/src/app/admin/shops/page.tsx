"use client";

import { useState } from "react";

import TopBar from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Caption from "@/components/shared/Caption";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TableState from "@/components/shared/TableState";
import SuspendDialog from "@/components/features/admin/SuspendDialog";
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useDebounced } from "@/lib/hooks/use-debounced";
import {
  useAdminShops,
  useReactivateShop,
  useSuspendShop,
} from "@/lib/hooks/use-admin";
import type { AdminShop, ShopStatus } from "@/lib/types/admin";

const content = {
  th: {
    title: "ร้านค้าทั้งหมด",
    searchPh: "ค้นหาชื่อร้าน…",
    allStatus: "ทุกสถานะ",
    statusOptions: { ACTIVE: "เปิดใช้งาน", SUSPENDED: "ถูกระงับ" },
    columns: ["ร้านค้า", "เจ้าของ", "สร้างเมื่อ", "สถานะ", ""],
    suspendBtn: "ระงับ",
    reinstateBtn: "ปลดระงับ",
    statusDeleted: "ถูกลบ",
    loading: "กำลังโหลดรายชื่อร้านค้า…",
    empty: "ไม่พบร้านค้าที่ตรงกับเงื่อนไข",
    totalPrefix: "ทั้งหมด",
    totalSuffix: "ร้าน",
    caption:
      "Admin ระงับการเข้าถึงร้าน/บัญชีได้ทันที ส่วนสถานะ read-only เกิดจาก subscription หมดอายุ ระบบจัดการเองอัตโนมัติ",
    dialogTitle: "ระงับร้านค้า",
    dialogDesc:
      "ร้านนี้จะถูกปิดการเข้าถึงทันที ทั้งเจ้าของร้านและพนักงานทุกคนในร้าน",
    reasonLabel: "เหตุผล",
    reasonPh: "เช่น ขายสินค้าผิดเงื่อนไข",
    confirm: "ยืนยันระงับ",
    cancel: "ยกเลิก",
  },
  en: {
    title: "All Shops",
    searchPh: "Search by shop name…",
    allStatus: "All Statuses",
    statusOptions: { ACTIVE: "Active", SUSPENDED: "Suspended" },
    columns: ["Shop", "Owner", "Created", "Status", ""],
    suspendBtn: "Suspend",
    reinstateBtn: "Reinstate",
    statusDeleted: "Deleted",
    loading: "Loading shops…",
    empty: "No shops match these filters",
    totalPrefix: "Total",
    totalSuffix: "shops",
    caption:
      "Admins can suspend shop/account access immediately. Read-only status from an expired subscription is handled automatically by the system.",
    dialogTitle: "Suspend Shop",
    dialogDesc:
      "Access to this shop is cut off immediately, for the owner and every staff member.",
    reasonLabel: "Reason",
    reasonPh: "e.g. selling prohibited items",
    confirm: "Confirm Suspend",
    cancel: "Cancel",
  },
};

export default function AdminShopsPage() {
  const { locale } = useLocale();
  const t = content[locale];

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ShopStatus | "all">("all");
  const q = useDebounced(search);

  const { data, isPending, error } = useAdminShops({
    q: q || undefined,
    status: status === "all" ? undefined : status,
  });

  const suspend = useSuspendShop();
  const reactivate = useReactivateShop();
  const [target, setTarget] = useState<AdminShop | null>(null);

  const shops = data?.items ?? [];
  const dateFormat = new Intl.DateTimeFormat(
    locale === "th" ? "th-TH" : "en-GB",
    { day: "numeric", month: "short", year: "2-digit" },
  );

  return (
    <>
      <TopBar title={t.title} notifications={false} user={roleAvatar.superadmin[locale]} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="flex flex-col gap-5">
          <div className="flex gap-3">
            <Input
              placeholder={t.searchPh}
              className="flex-1"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as ShopStatus | "all")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allStatus}</SelectItem>
                <SelectItem value="ACTIVE">{t.statusOptions.ACTIVE}</SelectItem>
                <SelectItem value="SUSPENDED">
                  {t.statusOptions.SUSPENDED}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="p-0 overflow-x-auto">
            <table className="w-full min-w-125 border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  {t.columns.map((h, i) => (
                    <th
                      key={i}
                      className="px-5 py-3 text-left text-xs font-medium tracking-[0.05em] text-muted-foreground uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <TableState
                  colSpan={t.columns.length}
                  isLoading={isPending}
                  error={error}
                  isEmpty={shops.length === 0}
                  loadingLabel={t.loading}
                  emptyLabel={t.empty}
                />
                {shops.map((s, i) => {
                  const isDeleted = s.deletedAt !== null;
                  const isSuspended = s.status === "SUSPENDED";

                  return (
                    <tr
                      key={s.id}
                      className={
                        i < shops.length - 1 ? "border-b border-border" : ""
                      }
                    >
                      <td className="px-5 py-3.5 font-semibold">{s.name}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {s.owner.firstName} {s.owner.lastName}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[13px] text-muted-foreground">
                        {dateFormat.format(new Date(s.createdAt))}
                      </td>
                      <td className="px-5 py-3.5">
                        {isDeleted ? (
                          <Badge variant="neutral">{t.statusDeleted}</Badge>
                        ) : isSuspended ? (
                          <Badge variant="error">
                            {t.statusOptions.SUSPENDED}
                          </Badge>
                        ) : (
                          <Badge variant="success">
                            {t.statusOptions.ACTIVE}
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {!isDeleted &&
                          (isSuspended ? (
                            <Button
                              variant="dark"
                              size="sm"
                              disabled={reactivate.isPending}
                              onClick={() => reactivate.mutate({ id: s.id })}
                            >
                              {t.reinstateBtn}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setTarget(s)}
                            >
                              {t.suspendBtn}
                            </Button>
                          ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {data && (
            <div className="text-[13px] text-muted-foreground">
              {t.totalPrefix} {data.meta.total} {t.totalSuffix}
            </div>
          )}

          <Caption>{t.caption}</Caption>
        </div>
      </main>

      <SuspendDialog
        open={target !== null}
        title={t.dialogTitle}
        description={t.dialogDesc}
        reasonLabel={t.reasonLabel}
        reasonPlaceholder={t.reasonPh}
        confirmLabel={t.confirm}
        cancelLabel={t.cancel}
        isPending={suspend.isPending}
        error={suspend.error?.message ?? null}
        onClose={() => {
          setTarget(null);
          suspend.reset();
        }}
        onConfirm={(reason) => {
          if (!target) return;
          suspend.mutate(
            { id: target.id, reason },
            { onSuccess: () => setTarget(null) },
          );
        }}
      />
    </>
  );
}

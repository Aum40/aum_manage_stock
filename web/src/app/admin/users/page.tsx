"use client";

import { useState } from "react";

import TopBar from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  useAdminUsers,
  useReactivateUser,
  useSuspendUser,
} from "@/lib/hooks/use-admin";
import type { AdminUser, UserRole } from "@/lib/types/admin";

const content = {
  th: {
    title: "ผู้ใช้ทั้งหมด",
    searchPh: "ค้นหาชื่อ อีเมล หรือ username…",
    allRoles: "ทุกบทบาท",
    roles: {
      SHOP_OWNER: "เจ้าของร้าน",
      SHOP_STAFF: "พนักงาน",
      ADMIN: "Admin",
      SUPER_ADMIN: "Super Admin",
    },
    columns: ["ผู้ใช้", "ต้นทางเข้าสู่ระบบ", "บทบาท", "สถานะ", ""],
    suspendBtn: "ระงับ",
    reinstateBtn: "ปลดระงับ",
    statusActive: "ปกติ",
    statusSuspended: "ถูกระงับ",
    statusDeleted: "ถูกลบ",
    loading: "กำลังโหลดรายชื่อผู้ใช้…",
    empty: "ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข",
    totalSuffix: "บัญชี",
    totalPrefix: "ทั้งหมด",
    dialogTitle: "ระงับบัญชีผู้ใช้",
    dialogDesc:
      "บัญชีนี้จะเข้าสู่ระบบไม่ได้ทันที และ session ที่ค้างอยู่จะถูกตัดทั้งหมด",
    reasonLabel: "เหตุผล",
    reasonPh: "เช่น ละเมิดเงื่อนไขการใช้งาน",
    confirm: "ยืนยันระงับ",
    cancel: "ยกเลิก",
  },
  en: {
    title: "All Users",
    searchPh: "Search by name, email, or username…",
    allRoles: "All Roles",
    roles: {
      SHOP_OWNER: "Shop Owner",
      SHOP_STAFF: "Staff",
      ADMIN: "Admin",
      SUPER_ADMIN: "Super Admin",
    },
    columns: ["User", "Login Method", "Role", "Status", ""],
    suspendBtn: "Suspend",
    reinstateBtn: "Reinstate",
    statusActive: "Normal",
    statusSuspended: "Suspended",
    statusDeleted: "Deleted",
    loading: "Loading users…",
    empty: "No users match these filters",
    totalSuffix: "accounts",
    totalPrefix: "Total",
    dialogTitle: "Suspend User Account",
    dialogDesc:
      "This account will be locked out immediately and all active sessions revoked.",
    reasonLabel: "Reason",
    reasonPh: "e.g. terms of service violation",
    confirm: "Confirm Suspend",
    cancel: "Cancel",
  },
};

const roleVariant = {
  SHOP_OWNER: "warning",
  SHOP_STAFF: "neutral",
  ADMIN: "success",
  SUPER_ADMIN: "warning",
} as const;

/** api ไม่ได้ส่ง "ช่องทางเข้าสู่ระบบ" มาตรงๆ แต่ดูได้จากว่ามี identifier อะไรผูกไว้บ้าง */
function loginMethods(user: AdminUser): string {
  const methods = [
    user.email && "Email",
    user.username && "Username",
    user.lineUserId && "LINE",
    user.googleId && "Google",
  ].filter(Boolean);

  return methods.length > 0 ? methods.join(" · ") : "—";
}

export default function AdminUsersPage() {
  const { locale } = useLocale();
  const t = content[locale];

  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole | "all">("all");
  const q = useDebounced(search);

  const { data, isPending, error } = useAdminUsers({
    q: q || undefined,
    role: role === "all" ? undefined : role,
  });

  const suspend = useSuspendUser();
  const reactivate = useReactivateUser();
  const [target, setTarget] = useState<AdminUser | null>(null);

  const users = data?.items ?? [];

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
              value={role}
              onValueChange={(value) => setRole(value as UserRole | "all")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allRoles}</SelectItem>
                <SelectItem value="SHOP_OWNER">{t.roles.SHOP_OWNER}</SelectItem>
                <SelectItem value="SHOP_STAFF">{t.roles.SHOP_STAFF}</SelectItem>
                <SelectItem value="ADMIN">{t.roles.ADMIN}</SelectItem>
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
                  isEmpty={users.length === 0}
                  loadingLabel={t.loading}
                  emptyLabel={t.empty}
                />
                {users.map((u, i) => {
                  const isDeleted = u.deletedAt !== null;
                  const isSuspended = u.status === "SUSPENDED";
                  // SUPER_ADMIN ระงับไม่ได้เลยฝั่ง api จึงไม่โชว์ปุ่มให้กดแล้วเด้ง error
                  const canAct = u.role !== "SUPER_ADMIN" && !isDeleted;

                  return (
                    <tr
                      key={u.id}
                      className={
                        i < users.length - 1 ? "border-b border-border" : ""
                      }
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-foreground">
                          {u.firstName} {u.lastName}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                          {u.email ?? u.username ?? u.id}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-muted-foreground">
                        {loginMethods(u)}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={roleVariant[u.role]}>
                          {t.roles[u.role]}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        {isDeleted ? (
                          <Badge variant="neutral">{t.statusDeleted}</Badge>
                        ) : isSuspended ? (
                          <Badge variant="error">{t.statusSuspended}</Badge>
                        ) : (
                          <Badge variant="success">{t.statusActive}</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {canAct &&
                          (isSuspended ? (
                            <Button
                              variant="dark"
                              size="sm"
                              disabled={reactivate.isPending}
                              onClick={() => reactivate.mutate({ id: u.id })}
                            >
                              {t.reinstateBtn}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setTarget(u)}
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

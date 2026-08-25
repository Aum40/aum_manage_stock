"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import TopBar from "@/components/layout/TopBar";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FormError } from "@/components/features/auth/form-error";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";
import { resolveApiError } from "@/lib/api-error";
import {
  createStaffSchema,
  resetStaffPasswordSchema,
  type CreateStaffInput,
  type ResetStaffPasswordInput,
} from "@/lib/validations/staff";
import type {
  ShopSummary,
  StaffAccount,
  StaffPermissions,
  StaffQuota,
} from "@/lib/types/staff";

const content = {
  th: {
    title: "พนักงานและสิทธิ์",
    staffListHeading: "พนักงานในร้าน",
    permHeading: (name: string) => `สิทธิ์ของ ${name}`,
    resetPwBtn: "รีเซ็ตรหัสผ่าน",
    deleteBtn: "ลบบัญชี",
    newStaffHeading: "สร้างบัญชีพนักงานใหม่",
    newStaffSub:
      "บัญชีนี้เจ้าของร้านสร้างให้เท่านั้นมี username และรหัสผ่านคู่เสมอ และเริ่มต้นยังไม่มีสิทธิ์ใดเปิดให้เลย",
    fieldFirstName: "ชื่อ",
    fieldLastName: "นามสกุล",
    fieldUsername: "Username",
    fieldPassword: "รหัสผ่าน",
    fieldConfirmPassword: "ยืนยันรหัสผ่าน",
    createAccountBtn: "สร้างบัญชี →",
    lineLinked: "ผูก LINE",
    lineNotLinked: "ยังไม่ผูก LINE",
    emptyStaff: "ยังไม่มีพนักงาน สร้างบัญชีแรกได้ที่ฟอร์มด้านล่าง",
    quota: (used: number, allowed: number) =>
      `ใช้ไปแล้ว ${used} จาก ${allowed} ที่นั่ง`,
    quotaFull: "โควตาพนักงานเต็มแล้ว ต้องอัปเกรดแพ็กเกจถึงจะเพิ่มได้",
    shopLabel: "เลือกร้านที่ต้องการตั้งสิทธิ์",
    notAssigned: "พนักงานคนนี้ยังไม่ได้สังกัดร้านนี้",
    assignBtn: "มอบหมายเข้าร้านนี้",
    unassignBtn: "ถอดออกจากร้านนี้",
    savePermBtn: "บันทึกสิทธิ์",
    saving: "กำลังบันทึก...",
    saved: "บันทึกสิทธิ์แล้ว",
    loading: "กำลังโหลด...",
    noShop: "ยังไม่มีร้าน ต้องสร้างร้านก่อนถึงจะตั้งสิทธิ์ได้",
    confirmDelete: (name: string) => `ลบบัญชีของ ${name}?`,
    passwordReset: "ตั้งรหัสผ่านใหม่ให้พนักงานแล้ว พนักงานจะถูกออกจากระบบทุกอุปกรณ์",
    newPasswordLabel: "รหัสผ่านใหม่",
    cancelBtn: "ยกเลิก",
    confirmDeleteTitle: "ลบบัญชีพนักงาน",
    confirmDeleteDesc: (name: string) =>
      `บัญชีของ ${name} จะถูกลบและออกจากระบบทันที ประวัติการขายและสต็อกที่เคยทำไว้ยังอยู่ครบ`,
    confirmUnassignTitle: "ถอดออกจากร้าน",
    confirmUnassignDesc: (name: string, shop: string) =>
      `${name} จะไม่เห็นข้อมูลของ ${shop} อีกต่อไป และสิทธิ์ทั้งหมดในร้านนี้จะถูกล้าง`,
    confirmBtn: "ตกลง",
    working: "กำลังดำเนินการ...",
    deleteSuccess: "ลบบัญชีแล้ว",
    unassignSuccess: "ถอดออกจากร้านแล้ว",
    permissions: [
      {
        key: "canManageProduct",
        name: "จัดการสินค้า",
        desc: "เพิ่ม แก้ไข และถอดสินค้า (soft delete)",
      },
      {
        key: "canAdjustStockManual",
        name: "ปรับสต็อกแบบ manual",
        desc: "ค้นหาสินค้าแล้วบันทึกจำนวนทีละรายการ",
      },
      {
        key: "canUseChatbot",
        name: "เข้าถึงแชทบอทสต็อก",
        desc: "สั่งงานผ่านเว็บ และผ่าน LINE ถ้าผูกบัญชีแล้ว",
      },
      {
        key: "canScanSale",
        name: "ขายสินค้าหน้าร้าน",
        desc: "สแกนบาร์โค้ดขายและบันทึกสต็อกอัตโนมัติ",
      },
      {
        key: "canViewDashboard",
        name: "ดูแดชบอร์ด",
        desc: "ให้เห็นภาพรวมร้านที่ถูกสังกัด",
      },
      {
        key: "canViewAiInsight",
        name: "ดูคำแนะนำ AI",
        desc: "คำแนะนำเติม/ระบายสต็อกและเทรนด์ขาย",
      },
    ],
  },
  en: {
    title: "Staff & Permissions",
    staffListHeading: "Shop Staff",
    permHeading: (name: string) => `Permissions for ${name}`,
    resetPwBtn: "Reset Password",
    deleteBtn: "Delete Account",
    newStaffHeading: "Create New Staff Account",
    newStaffSub:
      "Only the shop owner can create this account, which always comes with a username/password pair, and starts with every permission off.",
    fieldFirstName: "First Name",
    fieldLastName: "Last Name",
    fieldUsername: "Username",
    fieldPassword: "Password",
    fieldConfirmPassword: "Confirm Password",
    createAccountBtn: "Create Account →",
    lineLinked: "LINE Linked",
    lineNotLinked: "LINE Not Linked",
    emptyStaff: "No staff yet. Create the first account with the form below.",
    quota: (used: number, allowed: number) => `${used} of ${allowed} seats used`,
    quotaFull: "Staff quota is full. Upgrade the plan to add more.",
    shopLabel: "Choose a shop to set permissions for",
    notAssigned: "This staff member is not assigned to this shop yet",
    assignBtn: "Assign to this shop",
    unassignBtn: "Remove from this shop",
    savePermBtn: "Save Permissions",
    saving: "Saving...",
    saved: "Permissions saved",
    loading: "Loading...",
    noShop: "No shop yet. Create a shop before setting permissions.",
    confirmDelete: (name: string) => `Delete the account of ${name}?`,
    passwordReset:
      "The staff password has been reset. They will be signed out on every device.",
    newPasswordLabel: "New Password",
    cancelBtn: "Cancel",
    confirmDeleteTitle: "Delete Staff Account",
    confirmDeleteDesc: (name: string) =>
      `The account of ${name} will be deleted and signed out immediately. Their sales and stock history stays intact.`,
    confirmUnassignTitle: "Remove From Shop",
    confirmUnassignDesc: (name: string, shop: string) =>
      `${name} will no longer see ${shop}, and every permission in this shop will be cleared.`,
    confirmBtn: "Confirm",
    working: "Working...",
    deleteSuccess: "Account deleted",
    unassignSuccess: "Removed from the shop",
    permissions: [
      {
        key: "canManageProduct",
        name: "Manage Products",
        desc: "Add, edit, and remove products (soft delete)",
      },
      {
        key: "canAdjustStockManual",
        name: "Manual Stock Adjustment",
        desc: "Search for a product and record quantity one at a time",
      },
      {
        key: "canUseChatbot",
        name: "Stock Chatbot Access",
        desc: "Issue commands via web, and via LINE if linked",
      },
      {
        key: "canScanSale",
        name: "Sell at POS",
        desc: "Scan barcodes to sell and auto-update stock",
      },
      {
        key: "canViewDashboard",
        name: "View Dashboard",
        desc: "See an overview of the assigned shop",
      },
      {
        key: "canViewAiInsight",
        name: "View AI Recommendations",
        desc: "Restock/clearance suggestions and sales trends",
      },
    ],
  },
} as const;

const EMPTY_PERMISSIONS: StaffPermissions = {
  canManageProduct: false,
  canAdjustStockManual: false,
  canUseChatbot: false,
  canScanSale: false,
  canViewDashboard: false,
  canViewAiInsight: false,
};

const AVATAR_COLORS = ["#5C9A54", "#F5A31C", "#D65745", "#17161A", "#888"];

interface StaffManagerProps {
  staff: StaffAccount[];
  quota: StaffQuota;
  shops: ShopSummary[];
}

export default function StaffManager({
  staff,
  quota,
  shops,
}: StaffManagerProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const t = content[locale];

  const [selectedStaffId, setSelectedStaffId] = useState(staff[0]?.id ?? "");
  const [selectedShopId, setSelectedShopId] = useState(shops[0]?.id ?? "");
  const [permissions, setPermissions] = useState<StaffPermissions | null>(null);
  const [isAssigned, setIsAssigned] = useState(false);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [confirming, setConfirming] = useState<"delete" | "unassign" | null>(
    null,
  );

  const selectedStaff = staff.find((member) => member.id === selectedStaffId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateStaffInput>({ resolver: zodResolver(createStaffSchema) });

  const resetPasswordForm = useForm<ResetStaffPasswordInput>({
    resolver: zodResolver(resetStaffPasswordSchema),
  });

  // สิทธิ์ผูกกับคู่ (พนักงาน, ร้าน) ไม่ใช่กับพนักงานอย่างเดียว จึงต้องโหลดใหม่
  // ทุกครั้งที่เปลี่ยนอย่างใดอย่างหนึ่ง
  useEffect(() => {
    if (!selectedStaffId || !selectedShopId) return;

    let cancelled = false;

    void (async () => {
      setIsLoadingPermissions(true);
      setActionError(null);
      setNotice(null);

      const response = await fetch(
        `/api/shops/${selectedShopId}/staff/${selectedStaffId}/permissions`,
      );
      const data = await response.json().catch(() => null);

      if (cancelled) return;
      setIsLoadingPermissions(false);

      // 404 = ยังไม่ได้สังกัดร้านนี้ ซึ่งเป็นสถานะปกติของงาน ไม่ใช่ความผิดพลาด
      if (response.status === 404) {
        setIsAssigned(false);
        setPermissions({ ...EMPTY_PERMISSIONS });
        return;
      }

      if (!response.ok) {
        setIsAssigned(false);
        setPermissions(null);
        setActionError(resolveApiError(data, "โหลดสิทธิ์ไม่สำเร็จ"));
        return;
      }

      setIsAssigned(true);
      setPermissions({ ...EMPTY_PERMISSIONS, ...(data as StaffPermissions) });
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedStaffId, selectedShopId]);

  const onAssign = async () => {
    setActionError(null);

    const response = await fetch(`/api/staff/${selectedStaffId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId: selectedShopId }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setActionError(resolveApiError(data, "มอบหมายเข้าร้านไม่สำเร็จ"));
      return;
    }

    setIsAssigned(true);
    setPermissions({ ...EMPTY_PERMISSIONS });
    router.refresh();
  };

  const onUnassign = async (): Promise<boolean> => {
    setActionError(null);

    const response = await fetch(
      `/api/staff/${selectedStaffId}/assign/${selectedShopId}`,
      { method: "DELETE" },
    );

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setActionError(resolveApiError(data, "ถอดออกจากร้านไม่สำเร็จ"));
      return false;
    }

    setIsAssigned(false);
    setPermissions({ ...EMPTY_PERMISSIONS });
    router.refresh();
    return true;
  };

  const onSavePermissions = async () => {
    if (!permissions) return;

    setIsSaving(true);
    setActionError(null);
    setNotice(null);

    // PUT เขียนทับทั้งชุด ต้องส่งครบทุกฟิลด์ ไม่ใช่เฉพาะตัวที่เปลี่ยน
    const response = await fetch(
      `/api/shops/${selectedShopId}/staff/${selectedStaffId}/permissions`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(permissions),
      },
    );
    const data = await response.json().catch(() => null);
    setIsSaving(false);

    if (!response.ok) {
      setActionError(resolveApiError(data, "บันทึกสิทธิ์ไม่สำเร็จ"));
      return;
    }

    setNotice(t.saved);
  };

  const onCreateStaff = async (values: CreateStaffInput) => {
    setCreateError(null);

    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: values.firstName,
        lastName: values.lastName,
        username: values.username,
        password: values.password,
      }),
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setCreateError(resolveApiError(data, "สร้างบัญชีพนักงานไม่สำเร็จ"));
      return;
    }

    reset();
    router.refresh();
  };

  const onDeleteStaff = async (): Promise<boolean> => {
    if (!selectedStaff) return false;

    setActionError(null);

    const response = await fetch(`/api/users/${selectedStaff.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setActionError(resolveApiError(data, "ลบบัญชีไม่สำเร็จ"));
      return false;
    }

    setSelectedStaffId("");
    router.refresh();
    return true;
  };

  const onResetPassword = async (values: ResetStaffPasswordInput) => {
    if (!selectedStaff) return;

    setActionError(null);
    setNotice(null);

    const response = await fetch(
      `/api/users/${selectedStaff.id}/reset-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: values.newPassword }),
      },
    );
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setActionError(resolveApiError(data, "รีเซ็ตรหัสผ่านไม่สำเร็จ"));
      return;
    }

    resetPasswordForm.reset();
    setIsResettingPassword(false);
    setNotice(t.passwordReset);
  };

  const isQuotaFull = quota.remaining <= 0;

  return (
    <>
      <TopBar title={t.title} user={roleAvatar.owner[locale]} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
            <Card>
              <div className="px-4">
                <div className="mb-1 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                  {t.staffListHeading}
                </div>
                <p className="mb-4 text-xs text-muted-foreground">
                  {t.quota(quota.used, quota.allowed)}
                </p>

                {staff.length === 0 ? (
                  <p className="py-3 text-sm text-muted-foreground">
                    {t.emptyStaff}
                  </p>
                ) : (
                  staff.map((member, index) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setSelectedStaffId(member.id)}
                      className={`flex w-full items-center gap-3 py-3 text-left ${
                        index < staff.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <Avatar
                        className={
                          selectedStaffId === member.id
                            ? "ring-2 ring-primary ring-offset-2"
                            : ""
                        }
                      >
                        <AvatarFallback
                          className="font-heading font-bold text-white"
                          style={{
                            backgroundColor:
                              AVATAR_COLORS[index % AVATAR_COLORS.length],
                          }}
                        >
                          {member.firstName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">
                          {member.firstName} {member.lastName}
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {member.username}
                        </div>
                      </div>
                      <Badge variant={member.lineUserId ? "success" : "neutral"}>
                        {member.lineUserId ? t.lineLinked : t.lineNotLinked}
                      </Badge>
                    </button>
                  ))
                )}
              </div>
            </Card>

            <Card>
              <div className="px-4">
                <div className="mb-4 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                  {selectedStaff
                    ? t.permHeading(
                        `${selectedStaff.firstName} ${selectedStaff.lastName}`,
                      )
                    : t.staffListHeading}
                </div>

                {shops.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t.noShop}</p>
                ) : !selectedStaff ? (
                  <p className="text-sm text-muted-foreground">{t.emptyStaff}</p>
                ) : (
                  <>
                    <div className="mb-4 flex flex-col gap-1">
                      <Label
                        htmlFor="shopId"
                        className="text-[11px] font-semibold uppercase"
                      >
                        {t.shopLabel}
                      </Label>
                      <select
                        id="shopId"
                        value={selectedShopId}
                        onChange={(event) =>
                          setSelectedShopId(event.target.value)
                        }
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {shops.map((shop) => (
                          <option key={shop.id} value={shop.id}>
                            {shop.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {isLoadingPermissions ? (
                      <p className="py-3 text-sm text-muted-foreground">
                        {t.loading}
                      </p>
                    ) : !isAssigned ? (
                      <div className="flex flex-col items-start gap-3 py-3">
                        <p className="text-sm text-muted-foreground">
                          {t.notAssigned}
                        </p>
                        <Button variant="dark" size="sm" onClick={onAssign}>
                          {t.assignBtn}
                        </Button>
                      </div>
                    ) : (
                      permissions && (
                        <>
                          {t.permissions.map((permission, index) => (
                            <div
                              key={permission.key}
                              className={`flex items-center justify-between py-3 ${
                                index < t.permissions.length - 1
                                  ? "border-b border-border"
                                  : ""
                              }`}
                            >
                              <div>
                                <div className="text-sm font-semibold">
                                  {permission.name}
                                </div>
                                <div className="mt-0.5 text-xs text-muted-foreground">
                                  {permission.desc}
                                </div>
                              </div>
                              <Switch
                                checked={
                                  permissions[
                                    permission.key as keyof StaffPermissions
                                  ]
                                }
                                onCheckedChange={(value: boolean) =>
                                  setPermissions((previous) =>
                                    previous
                                      ? { ...previous, [permission.key]: value }
                                      : previous,
                                  )
                                }
                              />
                            </div>
                          ))}

                          {/* ปุ่มกลุ่มนี้ผูกกับ "ร้านที่เลือก" จึงอยู่ในเงื่อนไข isAssigned */}
                          <div className="mt-4 flex flex-wrap gap-2.5">
                            <Button
                              variant="dark"
                              size="sm"
                              disabled={isSaving}
                              onClick={onSavePermissions}
                            >
                              {isSaving ? t.saving : t.savePermBtn}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirming("unassign")}
                            >
                              {t.unassignBtn}
                            </Button>
                          </div>
                        </>
                      )
                    )}

                    {/*
                      รีเซ็ตรหัสผ่านกับลบบัญชีเป็นเรื่องระดับ "บัญชีผู้ใช้" ไม่ได้ผูกกับร้าน
                      จึงต้องกดได้เสมอที่เลือกพนักงานไว้ ไม่ใช่เฉพาะตอนสังกัดร้านแล้ว
                      (ไม่งั้นพนักงานที่ยังไม่ได้มอบหมายเข้าร้านจะลบทิ้งไม่ได้เลย)
                    */}
                    <div className="mt-4 flex flex-wrap gap-2.5 border-t border-border pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsResettingPassword((previous) => !previous);
                          setNotice(null);
                          setActionError(null);
                        }}
                      >
                        {isResettingPassword ? t.cancelBtn : t.resetPwBtn}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirming("delete")}
                      >
                        {t.deleteBtn}
                      </Button>
                    </div>

                    {isResettingPassword && (
                      <form
                        className="mt-3 flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-start"
                        onSubmit={resetPasswordForm.handleSubmit(
                          onResetPassword,
                        )}
                        noValidate
                      >
                        <div className="flex flex-1 flex-col gap-1">
                          <Label className="text-[11px] font-semibold uppercase">
                            {t.newPasswordLabel}
                          </Label>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...resetPasswordForm.register("newPassword")}
                          />
                          {resetPasswordForm.formState.errors.newPassword && (
                            <p className="text-xs text-destructive">
                              {
                                resetPasswordForm.formState.errors.newPassword
                                  .message
                              }
                            </p>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col gap-1">
                          <Label className="text-[11px] font-semibold uppercase">
                            {t.fieldConfirmPassword}
                          </Label>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...resetPasswordForm.register("confirmPassword")}
                          />
                          {resetPasswordForm.formState.errors
                            .confirmPassword && (
                            <p className="text-xs text-destructive">
                              {
                                resetPasswordForm.formState.errors
                                  .confirmPassword.message
                              }
                            </p>
                          )}
                        </div>
                        <div className="sm:pt-[22px]">
                          <Button
                            type="submit"
                            variant="dark"
                            size="sm"
                            disabled={resetPasswordForm.formState.isSubmitting}
                          >
                            {resetPasswordForm.formState.isSubmitting
                              ? t.saving
                              : t.resetPwBtn}
                          </Button>
                        </div>
                      </form>
                    )}

                    <div className="mt-3 flex flex-col gap-2">
                      <FormError message={actionError} />
                      {notice && (
                        <p className="rounded-md border border-status-green/30 bg-status-green/10 px-3 py-2 text-sm text-status-green">
                          {notice}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>

          <Card>
            <form
              className="px-4"
              onSubmit={handleSubmit(onCreateStaff)}
              noValidate
            >
              <div className="mb-1 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                {t.newStaffHeading}
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                {t.newStaffSub}
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-semibold uppercase">
                    {t.fieldFirstName}
                  </Label>
                  <Input {...register("firstName")} />
                  {errors.firstName && (
                    <p className="text-xs text-destructive">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-semibold uppercase">
                    {t.fieldLastName}
                  </Label>
                  <Input {...register("lastName")} />
                  {errors.lastName && (
                    <p className="text-xs text-destructive">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-semibold uppercase">
                    {t.fieldUsername}
                  </Label>
                  <Input placeholder="numwan_shop" {...register("username")} />
                  {errors.username && (
                    <p className="text-xs text-destructive">
                      {errors.username.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-semibold uppercase">
                    {t.fieldPassword}
                  </Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    {...register("password")}
                  />
                  {errors.password && (
                    <p className="text-xs text-destructive">
                      {errors.password.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-semibold uppercase">
                    {t.fieldConfirmPassword}
                  </Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    {...register("confirmPassword")}
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <FormError message={createError} />
              </div>

              {isQuotaFull && (
                <p className="mt-3 text-xs text-status-red">{t.quotaFull}</p>
              )}

              <div className="mt-4">
                <Button
                  type="submit"
                  variant="dark"
                  size="sm"
                  disabled={isSubmitting || isQuotaFull}
                >
                  {isSubmitting ? t.saving : t.createAccountBtn}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </main>

      <ConfirmDialog
        open={confirming !== null}
        title={
          confirming === "delete"
            ? t.confirmDeleteTitle
            : t.confirmUnassignTitle
        }
        description={
          selectedStaff
            ? confirming === "delete"
              ? t.confirmDeleteDesc(
                  `${selectedStaff.firstName} ${selectedStaff.lastName}`,
                )
              : t.confirmUnassignDesc(
                  `${selectedStaff.firstName} ${selectedStaff.lastName}`,
                  shops.find((shop) => shop.id === selectedShopId)?.name ?? "",
                )
            : undefined
        }
        confirmLabel={t.confirmBtn}
        cancelLabel={t.cancelBtn}
        pendingLabel={t.working}
        successLabel={
          confirming === "delete" ? t.deleteSuccess : t.unassignSuccess
        }
        destructive={confirming === "delete"}
        onConfirm={confirming === "delete" ? onDeleteStaff : onUnassign}
        onClose={() => setConfirming(null)}
      />
    </>
  );
}

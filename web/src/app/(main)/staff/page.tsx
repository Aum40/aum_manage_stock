"use client";

import { useState } from "react";

import TopBar from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useSetStaffPermissions, useShopStaff, useShops } from "@/lib/hooks/use-inventory";

const content = {
  th: {
    title: "พนักงานและสิทธิ์",
    staffListHeading: "พนักงานในร้าน",
    createStaffBtn: "สร้างบัญชีพนักงาน →",
    permHeading: (name: string) => `สิทธิ์ของ ${name}`,
    resetPwBtn: "รีเซ็ตรหัสผ่าน",
    unlinkLineBtn: "ถอดการผูก LINE",
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
    staffList: [
      { initial: "ค", name: "คำหวาน เก่งดี", username: "numwan_ladprao", lineStatus: "success" as const, lineLabel: "ผูก LINE", avatarBg: "#5C9A54" },
      { initial: "ต", name: "ต้น มั่นคง", username: "ton_stock01", lineStatus: "neutral" as const, lineLabel: "ยังไม่ผูก LINE", avatarBg: "#888" },
    ],
    permissions: [
      { name: "จัดการสินค้า", desc: "เพิ่ม แก้ไข และถอดสินค้า (soft delete)", on: true },
      { name: "ปรับสต็อกแบบ manual", desc: "ค้นหาสินค้าแล้วบันทึกจำนวนทีละรายการ", on: true },
      { name: "เข้าถึงแชทบอทสต็อก", desc: "สั่งงานผ่านเว็บ และผ่าน LINE ถ้าผูกบัญชีแล้ว", on: true },
      { name: "ขายสินค้าหน้าร้าน", desc: "สแกนบาร์โค้ดขายและบันทึกสต็อกอัตโนมัติ", on: false },
      { name: "ดูแดชบอร์ด", desc: "ให้เห็นภาพรวมร้านที่ถูกสังกัด", on: false },
      { name: "ดูคำแนะนำ AI", desc: "คำแนะนำเติม/ระบายสต็อกและเทรนด์ขาย", on: false },
    ],
  },
  en: {
    title: "Staff & Permissions",
    staffListHeading: "Shop Staff",
    createStaffBtn: "Create Staff Account →",
    permHeading: (name: string) => `${name}'s Permissions`,
    resetPwBtn: "Reset Password",
    unlinkLineBtn: "Unlink LINE",
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
    staffList: [
      { initial: "N", name: "Numwan Kengdee", username: "numwan_ladprao", lineStatus: "success" as const, lineLabel: "LINE Linked", avatarBg: "#5C9A54" },
      { initial: "T", name: "Ton Mankong", username: "ton_stock01", lineStatus: "neutral" as const, lineLabel: "LINE Not Linked", avatarBg: "#888" },
    ],
    permissions: [
      { name: "Manage Products", desc: "Add, edit, and remove products (soft delete)", on: true },
      { name: "Manual Stock Adjustment", desc: "Search for a product and record quantity one at a time", on: true },
      { name: "Stock Chatbot Access", desc: "Issue commands via web, and via LINE if linked", on: true },
      { name: "Sell at POS", desc: "Scan barcodes to sell and auto-update stock", on: false },
      { name: "View Dashboard", desc: "See an overview of the assigned shop", on: false },
      { name: "View AI Recommendations", desc: "Restock/clearance suggestions and sales trends", on: false },
    ],
  },
};

export default function StaffPage() {
  const { locale } = useLocale();
  const t = content[locale];
  const shopsQuery = useShops();
  const shopId = shopsQuery.data?.[0]?.id;
  const staffQuery = useShopStaff(shopId);
  const staff = staffQuery.data ?? [];
  // เก็บเป็น id ไม่ใช่ index — พอรายชื่อ refetch แล้วสั้นลง index เดิมจะชี้ผิดคน
  // และต้องมี effect คอยรีเซ็ต ส่วน id ตกไปเองถ้าไม่เจอ แล้ว fallback เป็นคนแรก
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedStaff = staff.find((entry) => entry.user.id === selectedId) ?? staff[0];
  const setPermissions = useSetStaffPermissions(shopId, selectedStaff?.user.id);

  const permissionKeys = ["canManageProduct", "canAdjustStockManual", "canUseChatbot", "canScanSale", "canViewDashboard", "canViewAiInsight"] as const;

  // อ่านสิทธิ์จากข้อมูลจริงตรงๆ ไม่ copy ลง state ผ่าน effect — ระหว่างที่ mutation
  // ยังไม่เสร็จใช้ค่าที่เพิ่งส่งไปแสดงแทน สวิตช์จะได้ขยับทันทีที่กด
  const effectivePermission = (setPermissions.isPending ? setPermissions.variables : selectedStaff?.permission) ?? selectedStaff?.permission;
  const perms = permissionKeys.map((key) => Boolean(effectivePermission?.[key]));

  const togglePermission = (index: number, value: boolean) => {
    if (!selectedStaff) return;
    setPermissions.mutate({ ...selectedStaff.permission, [permissionKeys[index]]: value });
  };

  return (
    <>
      <TopBar title={t.title} user={roleAvatar.owner[locale]} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
            <Card>
              <div className="px-4">
                <div className="mb-4 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                  {t.staffListHeading}
                </div>
                {staff.map((entry, i) => {
                  const s = entry.user;
                  const name = `${s.firstName} ${s.lastName}`.trim();
                  const initial = s.firstName?.charAt(0) || "?";
                  return (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`flex w-full items-center gap-3 py-3 text-left ${
                      i < staff.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <Avatar
                      className={selectedStaff?.user.id === s.id ? "ring-2 ring-primary ring-offset-2" : ""}
                    >
                      <AvatarFallback
                        className="font-heading font-bold text-white"
                        style={{ backgroundColor: s.status === "ACTIVE" ? "#5C9A54" : "#888" }}
                      >
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {s.username ?? s.email ?? "-"}
                      </div>
                    </div>
                    <Badge variant={s.lineUserId ? "success" : "neutral"}>{s.lineUserId ? (locale === "th" ? "ผูก LINE" : "LINE Linked") : (locale === "th" ? "ยังไม่ผูก LINE" : "LINE Not Linked")}</Badge>
                  </button>
                  );
                })}
                {staffQuery.isLoading && <div className="py-4 text-sm text-muted-foreground">Loading...</div>}
                <div className="mt-3">
                  <Button variant="dark" size="sm">
                    {t.createStaffBtn}
                  </Button>
                </div>
              </div>
            </Card>

            <Card>
              <div className="px-4">
                <div className="mb-4 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                  {t.permHeading(selectedStaff ? `${selectedStaff.user.firstName} ${selectedStaff.user.lastName}`.trim() : "-")}
                </div>
                {t.permissions.map((p, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between py-3 ${
                      i < t.permissions.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold">{p.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {p.desc}
                      </div>
                    </div>
                    <Switch
                      checked={perms[i]}
                      onCheckedChange={(v) => togglePermission(i, v)}
                    />
                  </div>
                ))}
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <Button variant="outline" size="sm">
                    {t.resetPwBtn}
                  </Button>
                  <Button variant="outline" size="sm">
                    {t.unlinkLineBtn}
                  </Button>
                  <Button variant="destructive" size="sm">
                    {t.deleteBtn}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <div className="px-4">
              <div className="mb-1 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                {t.newStaffHeading}
              </div>
              <p className="mb-4 text-xs text-muted-foreground">{t.newStaffSub}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-semibold uppercase">
                    {t.fieldFirstName}
                  </Label>
                    <Input placeholder={staff[0]?.user.firstName ?? ""} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-semibold uppercase">
                    {t.fieldLastName}
                  </Label>
                    <Input placeholder={staff[0]?.user.lastName ?? ""} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-semibold uppercase">
                    {t.fieldUsername}
                  </Label>
                  <Input placeholder="numwan_shop" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-semibold uppercase">
                    {t.fieldPassword}
                  </Label>
                  <Input type="password" placeholder="••••••••" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-semibold uppercase">
                    {t.fieldConfirmPassword}
                  </Label>
                  <Input type="password" placeholder="••••••••" />
                </div>
              </div>
              <div className="mt-4">
                <Button variant="dark" size="sm">
                  {t.createAccountBtn}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}

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
import QuotaMeter from "@/components/shared/QuotaMeter";
import QuotaStrip from "@/components/shared/QuotaStrip";
import PlanBadge from "@/components/shared/PlanBadge";
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";

const shopColors: Record<string, string> = { ล: "#F5A31C", บ: "#5C9A54", L: "#F5A31C", B: "#5C9A54" };

const content = {
  th: {
    title: "พนักงานและสิทธิ์",
    quotaLabel: "บัญชีพนักงาน",
    quotaHint: "พนักงานที่ผูกหลายร้านนับเพียง 1 บัญชี",
    staffListHeading: "พนักงานทั้งหมด",
    unassigned: "ยังไม่มอบหมาย",
    createStaffBtn: "สร้างบัญชีพนักงาน →",
    permHeading: (name: string) => `สิทธิ์ของ ${name}`,
    shopScopeHint: "สิทธิ์กำหนดแยกตามร้าน — คนเดียวกันมีสิทธิ์ต่างกันได้ในแต่ละร้าน",
    lockedHint: "แพ็กเกจ Plus ยังไม่รองรับคำแนะนำ AI",
    resetPwBtn: "รีเซ็ตรหัสผ่าน",
    unlinkLineBtn: "ถอดการผูก LINE",
    unassignBtn: "ถอดออกจากร้านนี้",
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
    shopLabels: ["สาขาลาดพร้าว", "สาขาบางนา"],
    staffList: [
      { initial: "ค", name: "คำหวาน เก่งดี", username: "numwan_ladprao", shops: ["ล", "บ"], avatarBg: "#5C9A54" },
      { initial: "ต", name: "ต้น มั่นคง", username: "ton_stock01", shops: ["ล"], avatarBg: "#888" },
      { initial: "ฝ", name: "ฝน สุขเจริญ", username: "fon_bangna", shops: ["บ"], avatarBg: "#888" },
      { initial: "ก", name: "ก้อง เก่งเกิน", username: "kong_stock02", shops: [] as string[], avatarBg: "#888" },
    ],
    permissions: [
      { name: "จัดการสินค้า", desc: "เพิ่ม แก้ไข และถอดสินค้าออกจากร้านนี้", on: true, locked: null },
      { name: "ปรับสต็อกแบบ manual", desc: "ค้นหาสินค้าแล้วบันทึกจำนวนทีละรายการ", on: true, locked: null },
      { name: "เข้าถึงแชทบอทสต็อก", desc: "สั่งงานผ่านเว็บ และผ่าน LINE ถ้าผูกบัญชีแล้ว", on: true, locked: null },
      { name: "ขายสินค้าหน้าร้าน", desc: "สแกนบาร์โค้ดขายและบันทึกสต็อกอัตโนมัติ", on: false, locked: null },
      { name: "ดูแดชบอร์ด", desc: "ให้เห็นภาพรวมร้านนี้", on: false, locked: null },
      { name: "ดูคำแนะนำ AI", desc: "คำแนะนำเติม/ระบายสต็อกและเทรนด์ขาย", on: false, locked: "PRO" as const },
    ],
  },
  en: {
    title: "Staff & Permissions",
    quotaLabel: "Staff Accounts",
    quotaHint: "Staff assigned to multiple shops still count as 1 account",
    staffListHeading: "All Staff",
    unassigned: "Unassigned",
    createStaffBtn: "Create Staff Account →",
    permHeading: (name: string) => `${name}'s Permissions`,
    shopScopeHint: "Permissions are set per shop — the same person can have different access at each shop.",
    lockedHint: "The Plus plan doesn't include AI recommendations yet",
    resetPwBtn: "Reset Password",
    unlinkLineBtn: "Unlink LINE",
    unassignBtn: "Remove From This Shop",
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
    shopLabels: ["Lat Phrao Branch", "Bang Na Branch"],
    staffList: [
      { initial: "N", name: "Numwan Kengdee", username: "numwan_ladprao", shops: ["L", "B"], avatarBg: "#5C9A54" },
      { initial: "T", name: "Ton Mankong", username: "ton_stock01", shops: ["L"], avatarBg: "#888" },
      { initial: "F", name: "Fon Sukcharoen", username: "fon_bangna", shops: ["B"], avatarBg: "#888" },
      { initial: "K", name: "Kong Kengkern", username: "kong_stock02", shops: [] as string[], avatarBg: "#888" },
    ],
    permissions: [
      { name: "Manage Products", desc: "Add, edit, and remove products from this shop", on: true, locked: null },
      { name: "Manual Stock Adjustment", desc: "Search for a product and record quantity one at a time", on: true, locked: null },
      { name: "Stock Chatbot Access", desc: "Issue commands via web, and via LINE if linked", on: true, locked: null },
      { name: "Sell at POS", desc: "Scan barcodes to sell and auto-update stock", on: false, locked: null },
      { name: "View Dashboard", desc: "See an overview of this shop", on: false, locked: null },
      { name: "View AI Recommendations", desc: "Restock/clearance suggestions and sales trends", on: false, locked: "PRO" as const },
    ],
  },
};

export default function StaffFullPage() {
  const { locale } = useLocale();
  const t = content[locale];
  const [selected, setSelected] = useState(0);
  const [shopTab, setShopTab] = useState(0);
  const [perms, setPerms] = useState(t.permissions.map((p) => p.on));

  return (
    <>
      <TopBar title={t.title} user={roleAvatar.owner[locale]} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="flex flex-col gap-5">
          <QuotaStrip>
            <div className="flex-1">
              <QuotaMeter label={t.quotaLabel} used={4} total={6} />
            </div>
            <span className="text-xs whitespace-nowrap text-muted-foreground">
              {t.quotaHint}
            </span>
          </QuotaStrip>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
            <Card>
              <div className="px-4">
                <div className="mb-4 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                  {t.staffListHeading}
                </div>
                {t.staffList.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setSelected(i)}
                    className={`flex w-full items-center gap-3 py-2.75 text-left ${
                      i < t.staffList.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <Avatar
                      className={selected === i ? "ring-2 ring-primary ring-offset-2" : ""}
                    >
                      <AvatarFallback
                        className="font-heading font-bold text-white"
                        style={{ backgroundColor: s.avatarBg }}
                      >
                        {s.initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{s.name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {s.username}
                      </div>
                    </div>
                    {s.shops.length === 0 ? (
                      <Badge variant="neutral">{t.unassigned}</Badge>
                    ) : (
                      <div className="flex gap-1">
                        {s.shops.map((sh) => (
                          <div
                            key={sh}
                            className="flex size-6 items-center justify-center rounded-md font-heading text-xs font-bold text-white"
                            style={{ backgroundColor: shopColors[sh] }}
                          >
                            {sh}
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
                <div className="mt-3">
                  <Button variant="dark" size="sm">
                    {t.createStaffBtn}
                  </Button>
                </div>
              </div>
            </Card>

            <Card>
              <div className="px-4">
                <div className="mb-3 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                  {t.permHeading(t.staffList[selected].name)}
                </div>

                <div className="mb-3 inline-flex gap-0.5 rounded-full bg-background p-1 ring-1 ring-border">
                  {t.shopLabels.map((l, i) => (
                    <button
                      key={i}
                      onClick={() => setShopTab(i)}
                      className={`rounded-full px-3.5 py-1.5 text-[13px] ${
                        i === shopTab
                          ? "bg-secondary font-bold text-foreground"
                          : "font-normal text-muted-foreground"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <div className="mb-3.5 text-xs text-muted-foreground">
                  {t.shopScopeHint}
                </div>

                {t.permissions.map((p, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between py-3 ${
                      i < t.permissions.length - 1 ? "border-b border-border" : ""
                    } ${p.locked ? "opacity-45" : ""}`}
                  >
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        {p.name}
                        {p.locked && <PlanBadge plan={p.locked} />}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {p.desc}
                      </div>
                      {p.locked && (
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {t.lockedHint}
                        </div>
                      )}
                    </div>
                    <Switch
                      checked={perms[i]}
                      disabled={!!p.locked}
                      onCheckedChange={(v) => {
                        if (p.locked) return;
                        setPerms((prev) =>
                          prev.map((x, idx) => (idx === i ? v : x))
                        );
                      }}
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
                  <Button variant="outline" size="sm">
                    {t.unassignBtn}
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
                  <Input placeholder={t.staffList[0].name.split(" ")[0]} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-semibold uppercase">
                    {t.fieldLastName}
                  </Label>
                  <Input placeholder={t.staffList[0].name.split(" ")[1] ?? ""} />
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

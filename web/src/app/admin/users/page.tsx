"use client";

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
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";

const content = {
  th: {
    title: "ผู้ใช้ทั้งหมด",
    searchPh: "ค้นหาชื่อ อีเมล หรือ username…",
    allRoles: "ทุกบทบาท",
    roles: { owner: "เจ้าของร้าน", staff: "พนักงาน", admin: "Admin" },
    columns: ["ผู้ใช้", "ต้นทางเข้าสู่ระบบ", "บทบาท", "สถานะ", ""],
    suspendBtn: "ระงับ",
    reinstateBtn: "ปลดระงับ",
    users: [
      { name: "อุ้ม เจนงาม", sub: "aum.jaingam@gmail.com", loginMethod: "Email · LINE", role: "เจ้าของร้าน", roleVariant: "warning" as const, status: "ปกติ", statusVariant: "success" as const, action: "suspend" },
      { name: "คำหวาน เก่งดี", sub: "numwan_ladprao", loginMethod: "Username · LINE", role: "พนักงาน", roleVariant: "neutral" as const, status: "ปกติ", statusVariant: "success" as const, action: "suspend" },
      { name: "สมศักดิ์ ขายวย", sub: "somsak.p", loginMethod: "Google", role: "เจ้าของร้าน", roleVariant: "warning" as const, status: "ถูกระงับ", statusVariant: "error" as const, action: "reinstate" },
      { name: "วิภา ตั้งเจน", sub: "wipa.admin", loginMethod: "Email", role: "Admin", roleVariant: "success" as const, status: "ปกติ", statusVariant: "success" as const, action: null },
    ],
  },
  en: {
    title: "All Users",
    searchPh: "Search by name, email, or username…",
    allRoles: "All Roles",
    roles: { owner: "Shop Owner", staff: "Staff", admin: "Admin" },
    columns: ["User", "Login Method", "Role", "Status", ""],
    suspendBtn: "Suspend",
    reinstateBtn: "Reinstate",
    users: [
      { name: "Aum Jaingam", sub: "aum.jaingam@gmail.com", loginMethod: "Email · LINE", role: "Shop Owner", roleVariant: "warning" as const, status: "Normal", statusVariant: "success" as const, action: "suspend" },
      { name: "Numwan Kengdee", sub: "numwan_ladprao", loginMethod: "Username · LINE", role: "Staff", roleVariant: "neutral" as const, status: "Normal", statusVariant: "success" as const, action: "suspend" },
      { name: "Somsak Khaiwoy", sub: "somsak.p", loginMethod: "Google", role: "Shop Owner", roleVariant: "warning" as const, status: "Suspended", statusVariant: "error" as const, action: "reinstate" },
      { name: "Wipa Tangjen", sub: "wipa.admin", loginMethod: "Email", role: "Admin", roleVariant: "success" as const, status: "Normal", statusVariant: "success" as const, action: null },
    ],
  },
};

export default function AdminUsersPage() {
  const { locale } = useLocale();
  const t = content[locale];

  return (
    <>
      <TopBar title={t.title} user={roleAvatar.superadmin[locale]} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="flex flex-col gap-5">
          <div className="flex gap-3">
            <Input placeholder={t.searchPh} className="flex-1" />
            <Select defaultValue="all">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allRoles}</SelectItem>
                <SelectItem value="owner">{t.roles.owner}</SelectItem>
                <SelectItem value="staff">{t.roles.staff}</SelectItem>
                <SelectItem value="admin">{t.roles.admin}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="p-0 overflow-x-auto">
            <table className="w-full min-w-125 border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  {t.columns.map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-medium tracking-[0.05em] text-muted-foreground uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.users.map((u, i) => (
                  <tr
                    key={i}
                    className={i < t.users.length - 1 ? "border-b border-border" : ""}
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-foreground">{u.name}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {u.sub}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-muted-foreground">
                      {u.loginMethod}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={u.roleVariant}>{u.role}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={u.statusVariant}>{u.status}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      {u.action === "suspend" && (
                        <Button variant="outline" size="sm">
                          {t.suspendBtn}
                        </Button>
                      )}
                      {u.action === "reinstate" && (
                        <Button variant="dark" size="sm">
                          {t.reinstateBtn}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </main>
    </>
  );
}

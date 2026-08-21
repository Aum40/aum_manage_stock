"use client";

import TopBar from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";

const content = {
  th: {
    title: "จัดการ Admin",
    bannerBody: "เมนูนี้เห็นได้เฉพาะ Super Admin — Admin ทั่วไปจะไม่เห็นเมนูนี้",
    intro: "Super Admin มีสิทธิ์เหมือน Admin และจัดการสิทธิ์ของ Admin คนอื่นเพิ่มเติม",
    addBtn: "เพิ่ม Admin →",
    columns: ["Admin", "สถานะ", ""],
    activeLabel: "ปกติ",
    revokeBtn: "ถอดสิทธิ์",
    admins: [
      { name: "สมชาย มั่นคง", role: "Super Admin", roleVariant: "warning" as const, canRemove: false },
      { name: "วิภา ตั้งเจน", role: "Admin", roleVariant: "success" as const, canRemove: true },
      { name: "กมลชนก เรียบร้อย", role: "Admin", roleVariant: "success" as const, canRemove: true },
    ],
  },
  en: {
    title: "Manage Admins",
    bannerBody: "This menu is only visible to Super Admin — regular Admins won't see it.",
    intro: "Super Admin has all Admin rights plus the ability to manage other Admins' access.",
    addBtn: "Add Admin →",
    columns: ["Admin", "Status", ""],
    activeLabel: "Normal",
    revokeBtn: "Revoke",
    admins: [
      { name: "Somchai Mankong", role: "Super Admin", roleVariant: "warning" as const, canRemove: false },
      { name: "Wipa Tangjen", role: "Admin", roleVariant: "success" as const, canRemove: true },
      { name: "Kamolchanok Riaproy", role: "Admin", roleVariant: "success" as const, canRemove: true },
    ],
  },
};

export default function AdminManagePage() {
  const { locale } = useLocale();
  const t = content[locale];

  return (
    <>
      <TopBar title={t.title} user={roleAvatar.superadmin[locale]} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="flex flex-col gap-5">
          <Alert variant="info">
            <AlertDescription className="text-foreground/80">
              {t.bannerBody}
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t.intro}</span>
            <Button variant="dark">{t.addBtn}</Button>
          </div>

          <Card className="p-0 overflow-x-auto">
            <table className="w-full min-w-125 border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  {t.columns.map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-medium tracking-[0.05em] text-muted-foreground uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.admins.map((a, i) => (
                  <tr
                    key={i}
                    className={
                      i < t.admins.length - 1 ? "border-b border-border" : ""
                    }
                  >
                    <td className="px-6 py-3.5">
                      <div className="font-semibold">{a.name}</div>
                      <div className="mt-1">
                        <Badge variant={a.roleVariant}>{a.role}</Badge>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge variant="success">{t.activeLabel}</Badge>
                    </td>
                    <td className="px-6 py-3.5">
                      {a.canRemove && (
                        <Button variant="outline" size="sm">
                          {t.revokeBtn}
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

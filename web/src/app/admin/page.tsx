"use client";

import TopBar from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";

const content = {
  th: {
    title: "ภาพรวมระบบ",
    logHeading: "เหตุการณ์ล่าสุด",
    columns: ["เหตุการณ์", "ประเภท", "โดย", "เวลา"],
    stats: [
      { iconBg: "#FEF3DC", icon: "👥", label: "ผู้ใช้ทั้งหมด", value: "1,248", tag: "▲ 36 คนเดือนนี้", tagVariant: "success" as const },
      { iconBg: "#E8F5E7", icon: "🏪", label: "ร้านค้าทั้งหมด", value: "763", tag: "▲ 21 ร้านเดือนนี้", tagVariant: "success" as const },
      { iconBg: "#FEF3DC", icon: "⏳", label: "สมาชิกที่ยังไม่หมดอายุ", value: "592", tag: "92% ของทั้งระบบ", tagVariant: "neutral" as const },
      { iconBg: "#FDEAE8", icon: "🚫", label: "ถูกระงับ", value: "8", tag: "ร้าน 5 · บัญชี 3", tagVariant: "error" as const },
    ],
    logs: [
      { event: 'ระงับร้าน "ขายดีมินิมาร์ท" (สินค้าผิดเงื่อนไข)', type: "ระงับร้าน", typeVariant: "error" as const, by: "Admin วิภา", time: "17 ส.ค. 10:04" },
      { event: "ปลดระงับบัญชี somsak.p", type: "ปลดระงับ", typeVariant: "success" as const, by: "Admin วิภา", time: "16 ส.ค. 15:40" },
      { event: "เพิ่มสิทธิ์ Admin ให้ กมลชนก", type: "สิทธิ์ Admin", typeVariant: "warning" as const, by: "Super Admin สมชาย", time: "15 ส.ค. 09:12" },
    ],
  },
  en: {
    title: "System Overview",
    logHeading: "Recent Activity",
    columns: ["Event", "Type", "By", "Time"],
    stats: [
      { iconBg: "#FEF3DC", icon: "👥", label: "Total Users", value: "1,248", tag: "▲ 36 this month", tagVariant: "success" as const },
      { iconBg: "#E8F5E7", icon: "🏪", label: "Total Shops", value: "763", tag: "▲ 21 this month", tagVariant: "success" as const },
      { iconBg: "#FEF3DC", icon: "⏳", label: "Non-Expired Members", value: "592", tag: "92% of all users", tagVariant: "neutral" as const },
      { iconBg: "#FDEAE8", icon: "🚫", label: "Suspended", value: "8", tag: "5 shops · 3 accounts", tagVariant: "error" as const },
    ],
    logs: [
      { event: '"Khaidee Minimart" suspended (policy violation)', type: "Shop Suspended", typeVariant: "error" as const, by: "Admin Wipa", time: "Aug 17, 10:04" },
      { event: "Account somsak.p reinstated", type: "Reinstated", typeVariant: "success" as const, by: "Admin Wipa", time: "Aug 16, 15:40" },
      { event: "Granted Admin rights to Kamolchanok", type: "Admin Rights", typeVariant: "warning" as const, by: "Super Admin Somchai", time: "Aug 15, 09:12" },
    ],
  },
};

export default function AdminOverviewPage() {
  const { locale } = useLocale();
  const t = content[locale];

  return (
    <>
      <TopBar title={t.title} user={roleAvatar.superadmin[locale]} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.stats.map((s) => (
              <Card key={s.label}>
                <div className="px-4">
                  <div
                    className="mb-3.5 flex size-12 items-center justify-center rounded-full text-xl"
                    style={{ backgroundColor: s.iconBg }}
                  >
                    {s.icon}
                  </div>
                  <div className="font-mono text-2xl font-bold tracking-[-0.02em] text-foreground">
                    {s.value}
                  </div>
                  <div className="mt-1 mb-2 text-[13px] text-muted-foreground">
                    {s.label}
                  </div>
                  <Badge variant={s.tagVariant}>{s.tag}</Badge>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-0 overflow-x-auto">
            <div className="px-6 pt-5 pb-3">
              <div className="font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                {t.logHeading}
              </div>
            </div>
            <table className="w-full min-w-125 border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  {t.columns.map((h) => (
                    <th
                      key={h}
                      className="px-6 py-2.5 text-left text-xs font-medium tracking-[0.05em] text-muted-foreground uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.logs.map((row, i) => (
                  <tr
                    key={i}
                    className={i < t.logs.length - 1 ? "border-b border-border" : ""}
                  >
                    <td className="px-6 py-3.5">{row.event}</td>
                    <td className="px-6 py-3.5">
                      <Badge variant={row.typeVariant}>{row.type}</Badge>
                    </td>
                    <td className="px-6 py-3.5 text-muted-foreground">{row.by}</td>
                    <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground">
                      {row.time}
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

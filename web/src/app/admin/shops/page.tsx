"use client";

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
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";

const content = {
  th: {
    title: "ร้านค้าทั้งหมด",
    searchPh: "ค้นหาชื่อร้านหรือเจ้าของ…",
    allStatus: "ทุกสถานะ",
    statusOptions: { active: "เปิดใช้งาน", readonly: "read-only", suspended: "ถูกระงับ" },
    columns: ["ร้านค้า", "เจ้าของ", "สินค้า", "สถานะ", ""],
    suspendBtn: "ระงับ",
    reinstateBtn: "ปลดระงับ",
    caption:
      "Admin ระงับเข้าถึงร้าน/บัญชีได้ทันทีเพื่อสวนสถานะ read-only เกิดจาก subscription หมดอายุ ระบบจัดการเองอัตโนมัติ",
    shops: [
      { name: "อุ้มมินิมาร์ท สาขาลาดพร้าว", owner: "อุ้ม เจนงาม", count: 312, status: "เปิดใช้งาน", statusVariant: "success" as const, action: "suspend" },
      { name: "อุ้มมินิมาร์ท สาขาบางนา", owner: "อุ้ม เจนงาม", count: 178, status: "เปิดใช้งาน", statusVariant: "success" as const, action: "suspend" },
      { name: "ป้าแดงของชำ", owner: "โต มีสุข", count: 96, status: "read-only (หมดอายุ)", statusVariant: "neutral" as const, action: "suspend" },
      { name: "ขายดีมินิมาร์ท", owner: "สมศักดิ์ ขายวย", count: 241, status: "ถูกระงับ", statusVariant: "error" as const, action: "reinstate" },
    ],
  },
  en: {
    title: "All Shops",
    searchPh: "Search by shop name or owner…",
    allStatus: "All Statuses",
    statusOptions: { active: "Active", readonly: "read-only", suspended: "Suspended" },
    columns: ["Shop", "Owner", "Products", "Status", ""],
    suspendBtn: "Suspend",
    reinstateBtn: "Reinstate",
    caption:
      "Admins can suspend shop/account access immediately. Read-only status from an expired subscription is handled automatically by the system.",
    shops: [
      { name: "Aum Minimart — Lat Phrao", owner: "Aum Jaingam", count: 312, status: "Active", statusVariant: "success" as const, action: "suspend" },
      { name: "Aum Minimart — Bang Na", owner: "Aum Jaingam", count: 178, status: "Active", statusVariant: "success" as const, action: "suspend" },
      { name: "Auntie Daeng's Grocery", owner: "To Meesuk", count: 96, status: "read-only (expired)", statusVariant: "neutral" as const, action: "suspend" },
      { name: "Khaidee Minimart", owner: "Somsak Khaiwoy", count: 241, status: "Suspended", statusVariant: "error" as const, action: "reinstate" },
    ],
  },
};

export default function AdminShopsPage() {
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
                <SelectItem value="all">{t.allStatus}</SelectItem>
                <SelectItem value="active">{t.statusOptions.active}</SelectItem>
                <SelectItem value="readonly">{t.statusOptions.readonly}</SelectItem>
                <SelectItem value="suspended">{t.statusOptions.suspended}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="p-0 overflow-x-auto">
            <table className="w-full min-w-125 border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  {t.columns.map((h, i) => (
                    <th
                      key={h}
                      className={`px-5 py-3 text-xs font-medium tracking-[0.05em] text-muted-foreground uppercase ${
                        i === 2 ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.shops.map((s, i) => (
                  <tr
                    key={i}
                    className={i < t.shops.length - 1 ? "border-b border-border" : ""}
                  >
                    <td className="px-5 py-3.5 font-semibold">{s.name}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{s.owner}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-[13px]">
                      {s.count}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={s.statusVariant}>{s.status}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      {s.action === "suspend" && (
                        <Button variant="outline" size="sm">
                          {t.suspendBtn}
                        </Button>
                      )}
                      {s.action === "reinstate" && (
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

          <Caption>{t.caption}</Caption>
        </div>
      </main>
    </>
  );
}

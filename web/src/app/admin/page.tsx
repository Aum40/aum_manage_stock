"use client";

import TopBar from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TableState from "@/components/shared/TableState";
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useAdminOverview } from "@/lib/hooks/use-admin";

const content = {
  th: {
    title: "ภาพรวมระบบ",
    planHeading: "สมาชิกแยกตามแพ็กเกจ",
    columns: ["แพ็กเกจ", "ผู้ใช้งาน"],
    loading: "กำลังโหลด…",
    empty: "ยังไม่มีข้อมูลแพ็กเกจ",
    dash: "—",
    stats: {
      users: "ผู้ใช้ทั้งหมด",
      shops: "ร้านค้าทั้งหมด",
      products: "สินค้าในระบบ",
      suspended: "ถูกระงับ",
    },
    tags: {
      owners: "เจ้าของร้าน",
      staff: "พนักงาน",
      deleted: "ถูกลบแล้ว",
      shopsWord: "ร้าน",
      accountsWord: "บัญชี",
      admins: "Admin",
      catalogNote: "ทั้งระบบ",
    },
    subscribersUnit: "คน",
  },
  en: {
    title: "System Overview",
    planHeading: "Subscribers by Plan",
    columns: ["Plan", "Subscribers"],
    loading: "Loading…",
    empty: "No plan data yet",
    dash: "—",
    stats: {
      users: "Total Users",
      shops: "Total Shops",
      products: "Products in System",
      suspended: "Suspended",
    },
    tags: {
      owners: "owners",
      staff: "staff",
      deleted: "deleted",
      shopsWord: "shops",
      accountsWord: "accounts",
      admins: "admins",
      catalogNote: "system-wide",
    },
    subscribersUnit: "users",
  },
};

const numberFormat = new Intl.NumberFormat("en-US");

function StatCard({
  tint,
  icon,
  label,
  value,
  tag,
  tagVariant,
}: {
  tint: string;
  icon: string;
  label: string;
  value: string;
  tag: string;
  tagVariant: "success" | "warning" | "error" | "neutral";
}) {
  return (
    <Card>
      <div className="px-4">
        <div
          className={`mb-3.5 flex size-12 items-center justify-center rounded-full text-xl ${tint}`}
        >
          {icon}
        </div>
        <div className="font-mono text-2xl font-bold tracking-[-0.02em] text-foreground">
          {value}
        </div>
        <div className="mt-1 mb-2 text-[13px] text-muted-foreground">
          {label}
        </div>
        <Badge variant={tagVariant}>{tag}</Badge>
      </div>
    </Card>
  );
}

export default function AdminOverviewPage() {
  const { locale } = useLocale();
  const t = content[locale];

  const { data, isPending, error } = useAdminOverview();

  const n = (value: number | undefined) =>
    value === undefined ? t.dash : numberFormat.format(value);

  const byRole = data?.users.byRole;
  const suspendedTotal =
    data === undefined
      ? undefined
      : data.users.suspended + data.shops.suspended;

  return (
    <>
      <TopBar title={t.title} notifications={false} user={roleAvatar.superadmin[locale]} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="flex flex-col gap-5">
          {error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error.message}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              tint="bg-status-orange/15"
              icon="👥"
              label={t.stats.users}
              value={n(data?.users.total)}
              tag={`${n(byRole?.SHOP_OWNER)} ${t.tags.owners} · ${n(byRole?.SHOP_STAFF)} ${t.tags.staff}`}
              tagVariant="neutral"
            />
            <StatCard
              tint="bg-status-green/15"
              icon="🏪"
              label={t.stats.shops}
              value={n(data?.shops.total)}
              tag={`${n(data?.shops.deleted)} ${t.tags.deleted}`}
              tagVariant="neutral"
            />
            <StatCard
              tint="bg-status-orange/15"
              icon="📦"
              label={t.stats.products}
              value={n(data?.products.total)}
              tag={t.tags.catalogNote}
              tagVariant="neutral"
            />
            <StatCard
              tint="bg-status-red/15"
              icon="🚫"
              label={t.stats.suspended}
              value={n(suspendedTotal)}
              tag={`${n(data?.shops.suspended)} ${t.tags.shopsWord} · ${n(data?.users.suspended)} ${t.tags.accountsWord}`}
              tagVariant={suspendedTotal ? "error" : "neutral"}
            />
          </div>

          {/*
            เดิมตรงนี้เป็นตาราง "เหตุการณ์ล่าสุด" ที่ hardcode ไว้ — api เก็บ admin_audit_logs
            จริง แต่ยังไม่มี endpoint ให้อ่าน (AdminController มีแค่ users/shops/overview)
            จึงแทนด้วยข้อมูลแพ็กเกจที่ /admin/overview ส่งมาจริงไปก่อน
            TODO: เพิ่ม GET /admin/audit-logs ฝั่ง api แล้วค่อยเอาตารางเหตุการณ์กลับมา
          */}
          <Card className="p-0 overflow-x-auto">
            <div className="px-6 pt-5 pb-3">
              <div className="font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                {t.planHeading}
              </div>
            </div>
            <table className="w-full min-w-125 border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  {t.columns.map((h, i) => (
                    <th
                      key={h}
                      className={`px-6 py-2.5 text-xs font-medium tracking-[0.05em] text-muted-foreground uppercase ${
                        i === 1 ? "text-right" : "text-left"
                      }`}
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
                  isEmpty={(data?.subscriptions.length ?? 0) === 0}
                  loadingLabel={t.loading}
                  emptyLabel={t.empty}
                />
                {(data?.subscriptions ?? []).map((plan, i, all) => (
                  <tr
                    key={plan.code}
                    className={
                      i < all.length - 1 ? "border-b border-border" : ""
                    }
                  >
                    <td className="px-6 py-3.5">
                      <span className="font-semibold">{plan.nameTh}</span>
                      <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                        {plan.code}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono text-[13px]">
                      {numberFormat.format(plan.subscribers)} {t.subscribersUnit}
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

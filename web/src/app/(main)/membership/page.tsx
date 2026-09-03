"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CardPaymentDialog from "@/components/features/payment/CardPaymentDialog";
import { useLocale } from "@/components/i18n/LocaleContext";
import { ApiError } from "@/lib/api-client";
import {
  useCreateSubscriptionPaymentIntent,
  useMySubscription,
  usePayments,
  useRetrySubscriptionPaymentIntent,
} from "@/lib/hooks/use-inventory";

function toMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

const STATUS_BADGE = {
  ACTIVE: "success",
  EXPIRED: "error",
  CANCELLED: "neutral",
} as const;

const content = {
  th: {
    title: "สมาชิกและการชำระเงิน",
    statusHeading: "สถานะสมาชิก",
    statusRows: [
      ["แพ็กเกจ", "รายปี (Basic)"],
      ["สถานะ", "active"],
      ["วันหมดอายุ", "12 มี.ค. 2570 (เหลือ 207 วัน)"],
      ["สิทธิ์สร้างร้าน", "2 / 3 ร้าน"],
    ],
    activeLabel: "กำลังใช้งาน",
    expiredLabel: "หมดอายุแล้ว",
    cancelledLabel: "ยกเลิกแล้ว",
    readOnlyNote: "แพ็กเกจหมดอายุ ร้านค้าอยู่ในโหมดอ่านอย่างเดียว",
    renewBtn: "ต่ออายุตอนนี้ →",
    renewing: "กำลังต่ออายุ…",
    renewError: "ต่ออายุไม่สำเร็จ",
    buyExtraHeading: "เพิ่มโควต้าด้วยการอัปเกรดแพ็กเกจ",
    buyExtraSub: "ระบบไม่มีการซื้อโควต้าแยก แพ็กเกจที่สูงขึ้นจะเพิ่มสิทธิ์ร้านค้า สินค้า และพนักงานตามแผน",
    qtyLabel: "เลือกแพ็กเกจที่ต้องการ",
    payBtn: "ดูแพ็กเกจ →",
    historyHeading: "ประวัติการชำระเงิน",
    columns: ["วันที่", "รายการ", "จำนวน", "ยอด", "สถานะ"],
    paidLabel: "ชำระแล้ว",
    purposes: { NEW_SUBSCRIPTION: "ซื้อแพ็กเกจ", RENEWAL: "ต่ออายุแพ็กเกจ" } as Record<string, string>,
    statuses: { PAID: "ชำระแล้ว", PENDING: "รอชำระเงิน", FAILED: "ไม่สำเร็จ", REFUNDED: "คืนเงินแล้ว" } as Record<string, string>,
    retryPayment: "ชำระอีกครั้ง",
    retryingPayment: "กำลังเปิดหน้าชำระเงิน…",
    retryError: "เปิดหน้าชำระเงินไม่สำเร็จ",
    payBefore: (at: string) => `ชำระภายใน ${at}`,
    paymentExpired: "หมดเวลาชำระแล้ว",
    historyEmpty: "ยังไม่มีประวัติการชำระเงิน",
    payHistory: [
      { date: "15 ส.ค. 2569", item: "ซื้อสิทธิ์ร้านเพิ่ม", qty: 1, amount: "฿590.00" },
      { date: "12 มี.ค. 2569", item: "สมัครแพ็กเกจรายปี (Basic)", qty: 1, amount: "฿1,990.00" },
    ],
  },
  en: {
    title: "Membership & Billing",
    statusHeading: "Membership Status",
    statusRows: [
      ["Plan", "Annual (Basic)"],
      ["Status", "active"],
      ["Expires", "Mar 12, 2027 (207 days left)"],
      ["Shop Slots", "2 / 3 shops"],
    ],
    activeLabel: "Active",
    expiredLabel: "Expired",
    cancelledLabel: "Cancelled",
    readOnlyNote: "Subscription expired — shops are in read-only mode.",
    renewBtn: "Renew Now →",
    renewing: "Renewing…",
    renewError: "Failed to renew",
    buyExtraHeading: "Increase Quota with a Plan Upgrade",
    buyExtraSub: "There are no separate quota add-ons. Upgrade your plan to increase shop, product, and staff limits.",
    qtyLabel: "Choose a plan",
    payBtn: "View Plans →",
    historyHeading: "Payment History",
    columns: ["Date", "Item", "Qty", "Amount", "Status"],
    paidLabel: "Paid",
    purposes: { NEW_SUBSCRIPTION: "Plan purchase", RENEWAL: "Plan renewal" } as Record<string, string>,
    statuses: { PAID: "Paid", PENDING: "Awaiting payment", FAILED: "Failed", REFUNDED: "Refunded" } as Record<string, string>,
    retryPayment: "Pay again",
    retryingPayment: "Opening checkout…",
    retryError: "Could not open checkout",
    payBefore: (at: string) => `Pay before ${at}`,
    paymentExpired: "Payment window closed",
    historyEmpty: "No payments yet",
    payHistory: [
      { date: "Aug 15, 2026", item: "Bought extra shop slot", qty: 1, amount: "฿590.00" },
      { date: "Mar 12, 2026", item: "Subscribed to Annual Plan (Basic)", qty: 1, amount: "฿1,990.00" },
    ],
  },
};

/** สถานะจาก api ตรงๆ ไม่ใช่เดาว่าจ่ายแล้วทุกแถว */
const PAYMENT_STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "neutral"> = {
  PAID: "success",
  PENDING: "warning",
  FAILED: "error",
  REFUNDED: "neutral",
};

export default function MembershipPage() {
  const { locale } = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = content[locale];
  const subscriptionQuery = useMySubscription();
  const paymentsQuery = usePayments();
  const createPayment = useCreateSubscriptionPaymentIntent();
  const retryPayment = useRetrySubscriptionPaymentIntent();
  const [payment, setPayment] = useState<{ paymentId: string; clientSecret: string; amount: number } | null>(null);
  const [renewError, setRenewError] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);
  const subscription = subscriptionQuery.data;
  const statusLabel = locale === "th" ? "สถานะ" : "Status";
  const statusRows = subscription
    ? [
        [
          locale === "th" ? "แพ็กเกจ" : "Plan",
          locale === "th"
            ? subscription.subscription.plan.nameTh
            : ({ FREE: "Free", PLUS: "Plus", PRO: "Pro" }[
                subscription.subscription.plan.code
              ] ?? subscription.subscription.plan.code),
        ],
        [statusLabel, subscription.subscription.status],
        [
          locale === "th" ? "วันหมดอายุ" : "Expires",
          subscription.subscription.expiresAt
            ? new Date(subscription.subscription.expiresAt).toLocaleDateString(locale === "th" ? "th-TH" : "en-US")
            : locale === "th" ? "ไม่มีวันหมดอายุ" : "No expiry",
        ],
        [locale === "th" ? "สิทธิ์สร้างร้าน" : "Shop Slots", `${subscription.quotas.shop.used} / ${subscription.quotas.shop.allowed}`],
        [locale === "th" ? "สินค้า" : "Products", `${subscription.quotas.product.used} / ${subscription.quotas.product.allowed ?? "∞"}`],
      ]
    : t.statusRows;

  const statusBadge = subscription
    ? {
        variant: STATUS_BADGE[subscription.subscription.status as keyof typeof STATUS_BADGE] ?? "neutral",
        label:
          subscription.subscription.status === "ACTIVE"
            ? t.activeLabel
            : subscription.subscription.status === "EXPIRED"
              ? t.expiredLabel
              : t.cancelledLabel,
      }
    : { variant: "success" as const, label: t.activeLabel };

  const currentPlanCode = subscription?.subscription.plan.code;
  const canRenew = Boolean(currentPlanCode) && currentPlanCode !== "FREE";

  const onRenew = () => {
    if (!currentPlanCode || currentPlanCode === "FREE" || createPayment.isPending) return;
    setRenewError(null);
    createPayment.mutate(currentPlanCode as "PLUS" | "PRO", {
      onSuccess: ({ paymentId, clientSecret, amountThb }) => {
        // ยอดมาจาก api เสมอ ไม่ใช่ราคาป้ายของแพ็กเกจ (ดู PaymentIntentResult)
        if (clientSecret) {
          setPayment({ paymentId, clientSecret, amount: amountThb });
        }
      },
      onError: (error) => {
        setRenewError(toMessage(error, t.renewError));
      },
    });
  };

  const onRetryPayment = (paymentId: string) => {
    if (retryPayment.isPending) return;
    setRetryError(null);
    retryPayment.mutate(paymentId, {
      onSuccess: ({ clientSecret, amountThb }) => {
        if (clientSecret) {
          setPayment({ paymentId, clientSecret, amount: amountThb });
        }
      },
      onError: (error) => setRetryError(toMessage(error, t.retryError)),
    });
  };

  return (
    <>
      <TopBar title={t.title} />
      {payment && (
        <CardPaymentDialog
          clientSecret={payment.clientSecret}
          paymentId={payment.paymentId}
          amount={payment.amount}
          locale={locale}
          onClose={() => setPayment(null)}
          onSuccess={() => {
            // จ่ายเงินสำเร็จแล้วแพ็กเกจ/โควตา/ประวัติเปลี่ยนหมด ล้าง cache
            // ให้ดึงใหม่แทนการ reload ทั้งหน้า
            setPayment(null);
            void queryClient.invalidateQueries();
            router.push("/membership?status=success");
          }}
        />
      )}
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <div className="px-4">
                <div className="mb-3 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                  {t.statusHeading}
                </div>
                {statusRows.map(([label, value], i) => (
                  <div
                    key={label}
                    className={`flex items-center justify-between py-2.75 ${
                      i < statusRows.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <span className="text-[13px] text-muted-foreground">
                      {label}
                    </span>
                    {label === statusLabel ? (
                      <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                    ) : (
                      <span className="text-sm font-semibold">{value}</span>
                    )}
                  </div>
                ))}
                {subscription?.readOnly && (
                  <p className="mt-3 text-xs text-destructive">{t.readOnlyNote}</p>
                )}
                {renewError && (
                  <p className="mt-3 text-xs text-destructive">{renewError}</p>
                )}
                {canRenew && (
                  <div className="mt-4">
                    <Button
                      variant="gradient"
                      disabled={createPayment.isPending}
                      onClick={onRenew}
                    >
                      {createPayment.isPending ? t.renewing : t.renewBtn}
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <div className="px-4">
                <div className="mb-1 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                  {t.buyExtraHeading}
                </div>
                <p className="mb-4 text-[13px] text-muted-foreground">
                  {t.buyExtraSub}
                </p>
                <div className="mb-3.5 text-[13px] text-muted-foreground">{t.qtyLabel}</div>
                <Button variant="dark" render={<Link href="/membership/upgrade" />}>{t.payBtn}</Button>
              </div>
            </Card>
          </div>

          <div>
            <div className="mb-3 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
              {t.historyHeading}
            </div>
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-125 border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {t.columns.map((h, i) => (
                      <th
                        key={h}
                        className={`px-5 py-3 text-xs font-medium text-muted-foreground uppercase ${
                          i === 2 || i === 3 ? "text-right" : "text-left"
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                    <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground" />
                  </tr>
                </thead>
                <tbody>
                  {(paymentsQuery.data ?? []).map((row) => (
                    <tr key={row.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3.5 font-mono text-[13px] text-muted-foreground">{new Date(row.createdAt).toLocaleDateString(locale === "th" ? "th-TH" : "en-US")}</td>
                      {/*
                        ห้ามใช้ row.subscription.plan — นั่นคือแพ็กเกจ "ปัจจุบัน" ของผู้ใช้
                        ไม่ใช่แพ็กเกจที่จ่ายในรายการนั้น คนที่ยังอยู่ Free แล้วกดซื้อ Plus
                        ค้างไว้จะเห็นเป็น "ฟรี ฿2,499" ซึ่งอ่านแล้วงง
                      */}
                      <td className="px-5 py-3.5">{t.purposes[row.purpose] ?? row.purpose}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-[13px]">1</td>
                      <td className="px-5 py-3.5 text-right font-mono text-[13px] font-semibold">฿{Number(row.amountThb).toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        <Badge variant={PAYMENT_STATUS_VARIANT[row.status] ?? "neutral"}>
                          {t.statuses[row.status] ?? row.status}
                        </Badge>
                      </td>
                      {/*
                        ปุ่มขึ้นตาม row.retryable ที่ api คำนวณให้ ไม่ใช่ตามสถานะ —
                        ใบชำระเงินมีอายุ 24 ชม. พ้นกำหนดแล้วต้องเริ่มรายการใหม่
                        จากหน้าอัปเกรด เพราะ PaymentIntent ฝั่ง Stripe ถูกยกเลิกไปแล้ว
                      */}
                      <td className="px-5 py-3.5 text-right">
                        {row.retryable ? (
                          <div className="flex flex-col items-end gap-1">
                            <Button
                              size="sm"
                              variant="gradient"
                              disabled={retryPayment.isPending}
                              onClick={() => onRetryPayment(row.id)}
                            >
                              {retryPayment.isPending ? t.retryingPayment : t.retryPayment}
                            </Button>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {t.payBefore(
                                new Date(row.expiresAt).toLocaleString(
                                  locale === "th" ? "th-TH" : "en-US",
                                  { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
                                ),
                              )}
                            </span>
                          </div>
                        ) : row.status === "PENDING" || row.status === "FAILED" ? (
                          <span className="text-xs text-muted-foreground">{t.paymentExpired}</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {retryError && (
                    <tr>
                      <td colSpan={t.columns.length + 1} className="px-5 py-3 text-sm text-destructive">
                        {retryError}
                      </td>
                    </tr>
                  )}
                  {paymentsQuery.data?.length === 0 && (
                    <tr>
                      <td colSpan={t.columns.length + 1} className="px-5 py-8 text-center text-sm text-muted-foreground">
                        {t.historyEmpty}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}

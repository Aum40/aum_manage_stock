"use client";

import {
  CardExpiryElement,
  CardNumberElement,
  CardCvcElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useState } from "react";
import { stripePromise } from "@/lib/stripe";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";

const cardOptions = {
  disableLink: true,
  style: {
    base: {
      fontSize: "16px",
      color: "#17161A",
      fontFamily: "Sarabun, sans-serif",
      "::placeholder": { color: "#8A8478" },
    },
    invalid: { color: "#D65745" },
  },
};

type Props = {
  clientSecret: string;
  paymentId: string;
  amount: number;
  locale: "th" | "en";
  onClose: () => void;
  onSuccess: () => void;
};

function CardPaymentForm({ clientSecret, paymentId, amount, locale, onClose, onSuccess }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [cardholderName, setCardholderName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements || submitting) return;
    const card = elements.getElement(CardNumberElement);
    if (!card) return;

    setSubmitting(true);
    setError(null);
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card,
        billing_details: { name: cardholderName || undefined },
      },
    });

    if (result.error) {
      setError(result.error.message ?? (locale === "th" ? "ชำระเงินไม่สำเร็จ" : "Payment failed"));
      setSubmitting(false);
      return;
    }
    if (result.paymentIntent?.status === "succeeded") {
      const confirmation = await api.post<{ message: string }>(
        `/api/backend/payments/${paymentId}/confirm`,
      ).catch((confirmationError) => ({ error: confirmationError }));
      if ("error" in confirmation) {
        setError(confirmation.error instanceof Error ? confirmation.error.message : (locale === "th" ? "ยืนยันการชำระเงินไม่สำเร็จ" : "Could not confirm payment"));
        setSubmitting(false);
        return;
      }
      onSuccess();
      return;
    }
    setError(locale === "th" ? "การชำระเงินยังไม่เสร็จสมบูรณ์" : "Payment was not completed");
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <form onSubmit={submit} className="w-full max-w-2xl rounded-3xl bg-background p-8 shadow-2xl sm:p-10">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">{locale === "th" ? "ชำระเงินด้วยบัตร" : "Pay by card"}</h2>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-muted-foreground" aria-label="Close">×</button>
        </div>
        <p className="mb-7 text-base text-muted-foreground">{locale === "th" ? "ยอดชำระ" : "Amount"} ฿{amount.toLocaleString()}</p>
        <label className="mb-1.5 block text-sm font-medium">{locale === "th" ? "ชื่อบนบัตร" : "Cardholder name"}</label>
        <input
          value={cardholderName}
          onChange={(event) => setCardholderName(event.target.value)}
          placeholder={locale === "th" ? "ชื่อบนบัตร" : "Name on card"}
          className="mb-4 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        />
        <label className="mb-1.5 block text-sm font-medium">{locale === "th" ? "หมายเลขบัตร" : "Card number"}</label>
        <div className="rounded-xl border border-border bg-background px-4 py-4">
          <CardNumberElement options={cardOptions} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">MM / YY</label>
            <div className="rounded-xl border border-border bg-background px-4 py-4">
              <CardExpiryElement options={cardOptions} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">CVC</label>
            <div className="rounded-xl border border-border bg-background px-4 py-4">
              <CardCvcElement options={cardOptions} />
            </div>
          </div>
        </div>
        {!stripe && <p className="mt-3 text-sm text-destructive">{locale === "th" ? "ยังไม่ได้ตั้งค่า Stripe สำหรับหน้าเว็บ" : "Stripe is not configured for the web app"}</p>}
        {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={!stripe || submitting} className="mt-5 h-11 w-full">
          {submitting ? (locale === "th" ? "กำลังชำระเงิน…" : "Processing…") : (locale === "th" ? "ชำระเงิน" : "Pay now")}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">{locale === "th" ? "รองรับเฉพาะบัตรเครดิตหรือเดบิต" : "Credit and debit cards only"}</p>
      </form>
    </div>
  );
}

export default function CardPaymentDialog(props: Props) {
  return <Elements stripe={stripePromise}><CardPaymentForm {...props} /></Elements>;
}

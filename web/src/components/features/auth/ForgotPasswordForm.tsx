"use client";

import Link from "next/link";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FormError } from "@/components/features/auth/form-error";
import { getAuthCopy } from "@/components/features/auth/auth-copy";
import { useLocale } from "@/components/i18n/LocaleContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveApiError } from "@/lib/api-error";
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "@/lib/validations/auth";

export default function ForgotPasswordForm() {
  const { locale } = useLocale();
  const text = getAuthCopy(locale).forgot;
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setFormError(null);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const result = await res.json().catch(() => null);
      setFormError(resolveApiError(result, locale === "th" ? "ส่งลิงก์ไม่สำเร็จ" : "Unable to send the reset link"));
      return;
    }

    // api ตอบ 200 เสมอไม่ว่าอีเมลจะมีจริงหรือไม่ กันการไล่เดาว่าอีเมลไหน
    // สมัครไว้แล้ว หน้าเว็บจึงต้องขึ้นข้อความกลางๆ แบบเดียวกันทุกกรณี
    setSent(true);
  };

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="info">
          <AlertDescription className="text-foreground/80">
            {text.sent}
          </AlertDescription>
        </Alert>

        <div className="text-center">
          <Link href="/login" className="text-[13px] font-bold text-primary">
          {text.back}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <Alert variant="info">
        <AlertDescription className="text-foreground/80">
          {text.hint}
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-1">
        <Label
          htmlFor="email"
          className="text-[11px] font-semibold tracking-[0.08em] uppercase"
        >
          {text.email}
        </Label>
        <Input
          id="email"
          type="email"
          placeholder={text.emailPlaceholder}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <FormError message={formError} />

      <Button
        type="submit"
        variant="dark"
        className="w-full py-5"
        disabled={isSubmitting}
      >
        {isSubmitting ? text.submitting : text.submit}
      </Button>

      <div className="text-center">
        <Link href="/login" className="text-[13px] font-bold text-primary">
          {text.back}
        </Link>
      </div>
    </form>
  );
}

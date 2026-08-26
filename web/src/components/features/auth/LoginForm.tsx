"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FormError } from "@/components/features/auth/form-error";
import { PasswordInput } from "@/components/features/auth/PasswordInput";
import { getAuthCopy } from "@/components/features/auth/auth-copy";
import { useLocale } from "@/components/i18n/LocaleContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SocialButtons from "@/components/features/auth/SocialButtons";
import { resolveApiError } from "@/lib/api-error";
import { loginSchema, type LoginValues } from "@/lib/validations/auth";

type LoginResponse =
  | { requires2fa: true; challengeToken: string }
  | { user: unknown };

const AFTER_LOGIN = "/dashboard";

export default function LoginForm() {
  const { locale } = useLocale();
  const text = getAuthCopy(locale).login;
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">(
    "idle",
  );
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onResendVerification = async () => {
    if (!unverifiedEmail) return;
    setResendState("sending");

    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: unverifiedEmail }),
    }).catch(() => null);

    setResendState("sent");
  };

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    setUnverifiedEmail(null);
    setResendState("idle");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result: LoginResponse & { message?: string | string[] } = await res
      .json()
      .catch(() => null);

    if (!res.ok) {
      setFormError(resolveApiError(result, locale === "th" ? "เข้าสู่ระบบไม่สำเร็จ" : "Unable to log in"));
      // เสนอปุ่มขอลิงก์ยืนยันใหม่ได้เฉพาะตอนที่ผู้ใช้กรอกอีเมลมา
      // ถ้ากรอก username มาเราไม่รู้ว่าอีเมลไหน ต้องให้ไปขอที่หน้าลืมรหัสผ่าน
      setUnverifiedEmail(
        result?.message === "Email not verified" &&
          values.identifier.includes("@")
          ? values.identifier
          : null,
      );
      return;
    }

    // SRS §111 — บัญชีที่เปิด 2FA จะยังไม่ได้ token ต้องกรอกรหัส 6 หลักก่อน
    if ("requires2fa" in result) {
      setChallengeToken(result.challengeToken);
      return;
    }

    router.push(AFTER_LOGIN);
    router.refresh();
  };

  const onVerifyOtp = async () => {
    if (!challengeToken) return;
    setOtpError(null);
    setIsVerifying(true);

    // สองเส้นนี้ทำงานเหมือนกันคือแลก challengeToken เป็น session
    // ต่างแค่ใช้รหัส 6 หลักจากแอป หรือรหัสกู้คืนที่ได้ตอนเปิด 2FA
    const endpoint = useRecovery
      ? "/api/auth/2fa/recovery"
      : "/api/auth/2fa/verify";
    const payload = useRecovery
      ? { challengeToken, recoveryCode: otpCode }
      : { challengeToken, otpCode };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json().catch(() => null);
    setIsVerifying(false);

    if (!res.ok) {
      setOtpError(
        resolveApiError(
          result,
          useRecovery
            ? locale === "th" ? "รหัสกู้คืนไม่ถูกต้อง" : "Invalid recovery code"
            : locale === "th" ? "รหัสยืนยันไม่ถูกต้อง" : "Invalid verification code",
        ),
      );
      return;
    }

    router.push(AFTER_LOGIN);
    router.refresh();
  };

  if (challengeToken) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-muted-foreground">
          {useRecovery
            ? text.recovery
            : text.otp}
        </p>
        <div className="flex flex-col gap-1">
          <Label
            htmlFor="otpCode"
            className="text-[11px] font-semibold tracking-[0.08em] uppercase"
          >
            {useRecovery ? text.recoveryLabel : text.otpLabel}
          </Label>
          <Input
            id="otpCode"
            inputMode={useRecovery ? "text" : "numeric"}
            autoComplete="one-time-code"
            maxLength={useRecovery ? 32 : 6}
            placeholder={useRecovery ? "xxxx-xxxx" : "000000"}
            value={otpCode}
            onChange={(event) => setOtpCode(event.target.value.trim())}
          />
          <FormError message={otpError} />
        </div>

        <Button
          type="button"
          variant="gradient"
          className="w-full py-5"
          disabled={isVerifying || (useRecovery ? !otpCode : otpCode.length !== 6)}
          onClick={onVerifyOtp}
        >
          {isVerifying ? text.verifying : text.verify}
        </Button>

        <div className="text-center text-[13px] text-muted-foreground">
          <button
            type="button"
            className="font-bold text-primary"
            onClick={() => {
              setUseRecovery((prev) => !prev);
              setOtpCode("");
              setOtpError(null);
            }}
          >
            {useRecovery
              ? text.useOtp
              : text.useRecovery}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-1">
        <Label
          htmlFor="identifier"
          className="text-[11px] font-semibold tracking-[0.08em] uppercase"
        >
          {text.identifier}
        </Label>
        <Input
          id="identifier"
          placeholder={text.identifierPlaceholder}
          {...register("identifier")}
        />
        <p className="text-xs text-muted-foreground">
          {text.identifierHint}
        </p>
        {errors.identifier && (
          <p className="text-xs text-destructive">
            {errors.identifier.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Label
          htmlFor="password"
          className="text-[11px] font-semibold tracking-[0.08em] uppercase"
        >
          {text.password}
        </Label>
        <PasswordInput
          id="password"
          placeholder={text.passwordPlaceholder}
          {...register("password")}
          showLabel={locale === "th" ? "แสดงรหัสผ่าน" : "Show password"}
          hideLabel={locale === "th" ? "ซ่อนรหัสผ่าน" : "Hide password"}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <FormError message={formError} />

      {unverifiedEmail && (
        <p className="text-[13px] text-muted-foreground">
          {resendState === "sent" ? (
            text.resent
          ) : (
            <button
              type="button"
              onClick={onResendVerification}
              disabled={resendState === "sending"}
              className="font-bold text-primary underline disabled:opacity-50"
            >
              {resendState === "sending"
                ? text.resending
                : text.resend}
            </button>
          )}
        </p>
      )}

      <Button
        type="submit"
        variant="gradient"
        className="w-full py-5"
        disabled={isSubmitting}
      >
        {isSubmitting ? text.submitting : text.submit}
      </Button>

      <SocialButtons mode="login" />

      <div className="mt-1 text-center text-[13px] text-muted-foreground">
        {text.noAccount}{" "}
        <Link href="/register" className="font-bold text-primary">
          {text.register}
        </Link>{" "}
        ·{" "}
        <Link href="/forgot-password" className="font-bold text-primary">
          {text.forgot}
        </Link>
      </div>
    </form>
  );
}

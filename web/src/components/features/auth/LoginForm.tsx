"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FormError } from "@/components/features/auth/form-error";
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
      setFormError(resolveApiError(result, "เข้าสู่ระบบไม่สำเร็จ"));
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
          useRecovery ? "รหัสกู้คืนไม่ถูกต้อง" : "รหัสยืนยันไม่ถูกต้อง",
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
            ? "กรอกรหัสกู้คืนที่ได้รับตอนเปิดใช้งาน 2 ขั้นตอน (ใช้ได้ครั้งเดียวต่อรหัส)"
            : "กรอกรหัส 6 หลักจากแอป Authenticator ของคุณ"}
        </p>
        <div className="flex flex-col gap-1">
          <Label
            htmlFor="otpCode"
            className="text-[11px] font-semibold tracking-[0.08em] uppercase"
          >
            {useRecovery ? "รหัสกู้คืน" : "รหัสยืนยัน 2 ขั้นตอน"}
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
          {isVerifying ? "กำลังยืนยัน..." : "ยืนยัน →"}
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
              ? "← กลับไปกรอกรหัสจากแอป"
              : "ใช้แอปยืนยันไม่ได้? ใช้รหัสกู้คืน"}
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
          อีเมล หรือ Username
        </Label>
        <Input
          id="identifier"
          placeholder="aum@example.com หรือ aum.jaingam"
          {...register("identifier")}
        />
        <p className="text-xs text-muted-foreground">
          เข้าด้วย username ได้ถ้าบัญชีนี้ตั้งรหัสผ่านไว้แล้ว
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
          รหัสผ่าน
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <FormError message={formError} />

      {unverifiedEmail && (
        <p className="text-[13px] text-muted-foreground">
          {resendState === "sent" ? (
            "ส่งลิงก์ยืนยันใหม่ไปที่อีเมลของคุณแล้ว"
          ) : (
            <button
              type="button"
              onClick={onResendVerification}
              disabled={resendState === "sending"}
              className="font-bold text-primary underline disabled:opacity-50"
            >
              {resendState === "sending"
                ? "กำลังส่ง..."
                : "ส่งลิงก์ยืนยันอีเมลอีกครั้ง"}
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
        {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ →"}
      </Button>

      <SocialButtons mode="login" />

      <div className="mt-1 text-center text-[13px] text-muted-foreground">
        ยังไม่มีบัญชี?{" "}
        <Link href="/register" className="font-bold text-primary">
          สมัครสมาชิก
        </Link>{" "}
        ·{" "}
        <Link href="/forgot-password" className="font-bold text-primary">
          ลืมรหัสผ่าน?
        </Link>
      </div>
    </form>
  );
}

"use client";

import Image from "next/image";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import Caption from "@/components/shared/Caption";
import { FormError } from "@/components/features/auth/form-error";
import { PasswordInput } from "@/components/features/auth/PasswordInput";
import { useLocale } from "@/components/i18n/LocaleContext";
import {
  useConfirmTwoFactor,
  useDisableTwoFactor,
  useStartTwoFactor,
} from "@/lib/hooks/use-profile";

const content = {
  th: {
    heading: "การยืนยันตัวตน 2 ขั้นตอน",
    on: "เปิดอยู่",
    off: "ปิดอยู่",
    descOn: "ทุกครั้งที่เข้าสู่ระบบต้องกรอกรหัส 6 หลักจากแอป Authenticator",
    descOff: "เพิ่มการยืนยันอีกชั้นด้วยแอป Authenticator เช่น Google Authenticator",
    enableBtn: "เปิดใช้งาน",
    disableBtn: "ปิดใช้งาน",
    cancel: "ยกเลิก",
    starting: "กำลังสร้าง QR...",
    scanTitle: "สแกน QR ด้วยแอป Authenticator",
    scanHint: "สแกนไม่ได้? กรอกคีย์นี้ในแอปแทน",
    otpLabel: "รหัส 6 หลักจากแอป",
    otpPh: "000000",
    confirmBtn: "ยืนยันและเปิดใช้งาน",
    confirming: "กำลังยืนยัน...",
    recoveryTitle: "เปิดใช้งาน 2 ขั้นตอนแล้ว",
    recoveryHint:
      "เก็บรหัสกู้คืนชุดนี้ไว้ให้ดี ใช้ได้รหัสละครั้งเมื่อเข้าถึงแอป Authenticator ไม่ได้ — ระบบจะไม่แสดงให้ดูอีก",
    recoveryDone: "บันทึกรหัสไว้แล้ว",
    disableTitle: "ยืนยันการปิด 2 ขั้นตอน",
    disableHint: "กรอกรหัส 6 หลักจากแอป หรือใช้รหัสกู้คืนแทน",
    passwordLabel: "รหัสผ่านปัจจุบัน",
    passwordPh: "กรอกรหัสผ่านปัจจุบัน",
    useRecovery: "ใช้แอปยืนยันไม่ได้? ใช้รหัสกู้คืน",
    backToOtp: "← กลับไปกรอกรหัสจากแอป",
    recoveryLabel: "รหัสกู้คืน",
    recoveryPh: "xxxx-xxxx",
    confirmDisable: "ยืนยันปิดใช้งาน",
    disabling: "กำลังปิด...",
  },
  en: {
    heading: "Two-Factor Authentication",
    on: "Enabled",
    off: "Disabled",
    descOn: "Every sign-in asks for a 6-digit code from your authenticator app",
    descOff: "Add a second step using an authenticator app such as Google Authenticator",
    enableBtn: "Enable",
    disableBtn: "Disable",
    cancel: "Cancel",
    starting: "Generating QR...",
    scanTitle: "Scan this QR with your authenticator app",
    scanHint: "Can't scan? Enter this key in the app instead",
    otpLabel: "6-digit code from the app",
    otpPh: "000000",
    confirmBtn: "Confirm and enable",
    confirming: "Verifying...",
    recoveryTitle: "Two-factor authentication is on",
    recoveryHint:
      "Save these recovery codes somewhere safe. Each works once if you lose access to the app — they will not be shown again.",
    recoveryDone: "I have saved them",
    disableTitle: "Confirm turning two-factor off",
    disableHint: "Enter the 6-digit code from your app, or use a recovery code",
    passwordLabel: "Current password",
    passwordPh: "Enter your current password",
    useRecovery: "Can't use the app? Use a recovery code",
    backToOtp: "← Back to the app code",
    recoveryLabel: "Recovery code",
    recoveryPh: "xxxx-xxxx",
    confirmDisable: "Confirm disable",
    disabling: "Disabling...",
  },
};

const HEADING_CLASS =
  "font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase";

export default function TwoFactorCard({
  enabled,
  hasPassword,
}: {
  enabled: boolean;
  hasPassword: boolean;
}) {
  const { locale } = useLocale();
  const t = content[locale];

  const start = useStartTwoFactor();
  const confirm = useConfirmTwoFactor();
  const disable = useDisableTwoFactor();

  const [mode, setMode] = useState<"idle" | "setup" | "codes" | "disable">(
    "idle",
  );
  const [otpCode, setOtpCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [password, setPassword] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);

  const reset = () => {
    setMode("idle");
    setOtpCode("");
    setRecoveryCode("");
    setPassword("");
    setUseRecovery(false);
    start.reset();
    confirm.reset();
    disable.reset();
  };

  const onStart = () => {
    start.mutate(undefined, { onSuccess: () => setMode("setup") });
  };

  const onConfirm = () => {
    confirm.mutate({ otpCode }, { onSuccess: () => setMode("codes") });
  };

  const onDisable = () => {
    disable.mutate(
      {
        ...(useRecovery ? { recoveryCode } : { otpCode }),
        // บัญชีที่ไม่มีรหัสผ่าน (สมัครผ่าน LINE/Google) ห้ามส่งช่องนี้ไป
        ...(hasPassword ? { password } : {}),
      },
      { onSuccess: reset },
    );
  };

  return (
    <Card>
      <div className="px-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className={HEADING_CLASS}>{t.heading}</div>
          <Badge variant={enabled ? "success" : "neutral"}>
            {enabled ? t.on : t.off}
          </Badge>
        </div>

        <p className="mb-4 text-[13px] text-muted-foreground">
          {enabled ? t.descOn : t.descOff}
        </p>

        {mode === "idle" && (
          <Button
            variant={enabled ? "outline" : "dark"}
            size="sm"
            disabled={start.isPending}
            onClick={() => (enabled ? setMode("disable") : onStart())}
          >
            {start.isPending
              ? t.starting
              : enabled
                ? t.disableBtn
                : t.enableBtn}
          </Button>
        )}

        {mode === "idle" && <FormError message={start.error?.message ?? null} />}

        {mode === "setup" && start.data && (
          <div className="flex flex-col gap-3.5">
            <div className="text-sm font-semibold">{t.scanTitle}</div>
            {/* api ส่ง QR มาเป็น data URL อยู่แล้ว จึงไม่ต้องผ่าน image optimizer */}
            <Image
              src={start.data.qrCodeDataUrl}
              alt={t.scanTitle}
              width={180}
              height={180}
              unoptimized
              className="rounded-lg border border-border bg-white p-2"
            />
            <div>
              <Caption>{t.scanHint}</Caption>
              <code className="mt-1 block font-mono text-[13px] break-all text-foreground">
                {start.data.secret}
              </code>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-[11px] font-semibold uppercase">
                {t.otpLabel}
              </Label>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder={t.otpPh}
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.trim())}
              />
            </div>

            <FormError message={confirm.error?.message ?? null} />

            <div className="flex gap-2.5">
              <Button
                variant="dark"
                size="sm"
                disabled={confirm.isPending || otpCode.length !== 6}
                onClick={onConfirm}
              >
                {confirm.isPending ? t.confirming : t.confirmBtn}
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>
                {t.cancel}
              </Button>
            </div>
          </div>
        )}

        {mode === "codes" && confirm.data && (
          <div className="flex flex-col gap-3">
            <div className="text-sm font-semibold text-status-green">
              {t.recoveryTitle}
            </div>
            <Caption>{t.recoveryHint}</Caption>
            <ul className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted p-3">
              {confirm.data.recoveryCodes.map((code) => (
                <li key={code} className="font-mono text-[13px]">
                  {code}
                </li>
              ))}
            </ul>
            <div>
              <Button variant="dark" size="sm" onClick={reset}>
                {t.recoveryDone}
              </Button>
            </div>
          </div>
        )}

        {mode === "disable" && (
          <div className="flex flex-col gap-3.5">
            <div className="text-sm font-semibold">{t.disableTitle}</div>
            <Caption>{t.disableHint}</Caption>

            {hasPassword && (
              <div className="flex flex-col gap-1">
                <Label className="text-[11px] font-semibold uppercase">
                  {t.passwordLabel}
                </Label>
                <PasswordInput
                  placeholder={t.passwordPh}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <Label className="text-[11px] font-semibold uppercase">
                {useRecovery ? t.recoveryLabel : t.otpLabel}
              </Label>
              <Input
                inputMode={useRecovery ? "text" : "numeric"}
                autoComplete="one-time-code"
                maxLength={useRecovery ? 32 : 6}
                placeholder={useRecovery ? t.recoveryPh : t.otpPh}
                value={useRecovery ? recoveryCode : otpCode}
                onChange={(event) =>
                  useRecovery
                    ? setRecoveryCode(event.target.value.trim())
                    : setOtpCode(event.target.value.trim())
                }
              />
            </div>

            <button
              type="button"
              className="self-start text-[13px] font-bold text-primary"
              onClick={() => {
                setUseRecovery((previous) => !previous);
                setOtpCode("");
                setRecoveryCode("");
                disable.reset();
              }}
            >
              {useRecovery ? t.backToOtp : t.useRecovery}
            </button>

            <FormError message={disable.error?.message ?? null} />

            <div className="flex gap-2.5">
              <Button
                variant="dark"
                size="sm"
                disabled={
                  disable.isPending ||
                  (hasPassword && password.length === 0) ||
                  (useRecovery ? recoveryCode.length === 0 : otpCode.length !== 6)
                }
                onClick={onDisable}
              >
                {disable.isPending ? t.disabling : t.confirmDisable}
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>
                {t.cancel}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

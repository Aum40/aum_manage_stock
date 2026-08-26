"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/features/auth/form-error";

/**
 * กล่องยืนยันการระงับ — api บังคับให้ส่ง reason (SuspendDto) และเหตุผลนั้นถูกเก็บลง
 * admin_audit_logs ถาวร จึงต้องให้พิมพ์จริงๆ ไม่ใช่ปุ่มกดผ่านเฉยๆ
 *
 * เขียนเองแทน shadcn dialog เพราะโปรเจกต์ยังไม่ได้ add component ตัวนั้นเข้ามา
 * ถ้าวันหลังทีมเพิ่ม dialog แล้ว เปลี่ยนข้างในไฟล์นี้ที่เดียวจบ
 */
type DialogProps = {
  title: string;
  description: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  confirmLabel: string;
  cancelLabel: string;
  isPending: boolean;
  error: string | null;
  onConfirm: (reason: string) => void;
  onClose: () => void;
};

export default function SuspendDialog({
  open,
  ...props
}: DialogProps & { open: boolean }) {
  // ถอดออกจาก tree ไปเลยตอนปิด เพื่อให้ช่องเหตุผลเริ่มจากค่าว่างทุกครั้งที่เปิดใหม่
  // (ถ้าแค่ซ่อนไว้ เหตุผลของร้านก่อนหน้าจะค้างมาให้กดยืนยันต่อได้)
  if (!open) return null;

  return <SuspendDialogContent {...props} />;
}

function SuspendDialogContent({
  title,
  description,
  reasonLabel,
  reasonPlaceholder,
  confirmLabel,
  cancelLabel,
  isPending,
  error,
  onConfirm,
  onClose,
}: DialogProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/40 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-100 rounded-xl border border-border bg-card p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="font-heading text-base font-bold text-foreground">
          {title}
        </div>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          {description}
        </p>

        <div className="mt-4 flex flex-col gap-1">
          <Label
            htmlFor="suspend-reason"
            className="text-[11px] font-semibold tracking-[0.08em] uppercase"
          >
            {reasonLabel}
          </Label>
          <Input
            id="suspend-reason"
            autoFocus
            maxLength={500}
            placeholder={reasonPlaceholder}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>

        <div className="mt-3">
          <FormError message={error} />
        </div>

        <div className="mt-4 flex justify-end gap-2.5">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button
            variant="dark"
            disabled={isPending || reason.trim().length === 0}
            onClick={() => onConfirm(reason.trim())}
          >
            {isPending ? "…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

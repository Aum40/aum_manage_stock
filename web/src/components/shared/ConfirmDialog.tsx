"use client";

import { useState } from "react";

import { SuccessCheck } from "@/components/shared/SuccessCheck";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  pendingLabel: string;
  successLabel: string;
  /** ปุ่มยืนยันเป็นสีแดงเมื่อการกระทำนั้นย้อนกลับไม่ได้ เช่น ลบบัญชี */
  destructive?: boolean;
  onConfirm: () => Promise<boolean>;
  onClose: () => void;
}

/**
 * กล่องยืนยันที่โชว์เครื่องหมายถูกให้เห็นก่อนปิด แทน window.confirm()
 *
 * ปิดเองหลังโชว์ผลสำเร็จ 1.2 วินาที — สั้นกว่านี้ผู้ใช้จะไม่ทันเห็นว่าสำเร็จ
 * ยาวกว่านี้จะรู้สึกว่าเว็บค้าง
 *
 * onConfirm คืน true = สำเร็จ (โชว์เครื่องหมายถูกแล้วปิด), false = ล้มเหลว
 * (ปิดทันทีเพื่อให้หน้าหลักแสดงข้อความ error ของมันเอง)
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  pendingLabel,
  successLabel,
  destructive = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [phase, setPhase] = useState<"idle" | "pending" | "success">("idle");

  const handleConfirm = async () => {
    setPhase("pending");
    const succeeded = await onConfirm();

    if (!succeeded) {
      setPhase("idle");
      onClose();
      return;
    }

    setPhase("success");
    setTimeout(() => {
      setPhase("idle");
      onClose();
    }, 1200);
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        // ระหว่างกำลังทำงานหรือกำลังโชว์ผล ห้ามปิดด้วย Esc หรือคลิกพื้นหลัง
        if (!nextOpen && phase === "idle") onClose();
      }}
    >
      <AlertDialogContent>
        {phase === "success" ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <SuccessCheck />
            <p className="text-sm font-semibold">{successLabel}</p>
          </div>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{title}</AlertDialogTitle>
              {description && (
                <AlertDialogDescription>{description}</AlertDialogDescription>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button
                variant="outline"
                size="sm"
                disabled={phase === "pending"}
                onClick={onClose}
              >
                {cancelLabel}
              </Button>
              <Button
                variant={destructive ? "destructive" : "dark"}
                size="sm"
                disabled={phase === "pending"}
                onClick={handleConfirm}
              >
                {phase === "pending" ? pendingLabel : confirmLabel}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Caption from "@/components/shared/Caption";
import { FormError } from "@/components/features/auth/form-error";
import { PasswordInput } from "@/components/features/auth/PasswordInput";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useCreateAdmin } from "@/lib/hooks/use-admin";
import { passwordSchema } from "@/lib/validations/auth";

const schema = z.object({
  firstName: z.string().min(1, "กรุณากรอกชื่อ"),
  lastName: z.string().min(1, "กรุณากรอกนามสกุล"),
  email: z.string().min(1, "กรุณากรอกอีเมล").email("อีเมลไม่ถูกต้อง"),
  password: passwordSchema,
});

type Values = z.infer<typeof schema>;

const content = {
  th: {
    title: "เพิ่มบัญชีผู้ดูแลระบบ",
    intro:
      "สร้างเป็นบัญชีใหม่ ไม่ใช่การเลื่อนขั้นผู้ใช้เดิม — บัญชีผู้ดูแลระบบไม่มีร้านค้า จึงแยกออกจากบัญชีเจ้าของร้านเสมอ",
    firstName: "ชื่อ",
    lastName: "นามสกุล",
    email: "อีเมล",
    emailHint: "ใช้อีเมลนี้เข้าสู่ระบบ ไม่ต้องยืนยันอีเมลอีกรอบ",
    password: "รหัสผ่านเริ่มต้น",
    passwordHint: "ส่งรหัสนี้ให้เจ้าตัวแล้วบอกให้เปลี่ยนเองที่หน้าโปรไฟล์",
    submit: "สร้างบัญชี",
    submitting: "กำลังสร้าง...",
    cancel: "ยกเลิก",
    roleNote:
      "บัญชีใหม่จะเป็น Admin ธรรมดา ถ้าต้องการให้เป็น Super Admin ค่อยเลื่อนขั้นในตารางด้านล่าง",
  },
  en: {
    title: "Add an admin account",
    intro:
      "This creates a new account rather than promoting an existing user — admin accounts own no shop, so they stay separate from shop owner accounts.",
    firstName: "First name",
    lastName: "Last name",
    email: "Email",
    emailHint: "Used to sign in. No separate email verification needed.",
    password: "Initial password",
    passwordHint: "Send it to them and ask them to change it from their profile.",
    submit: "Create account",
    submitting: "Creating...",
    cancel: "Cancel",
    roleNote:
      "New accounts start as a regular Admin. Promote to Super Admin from the table below if needed.",
  },
};

const LABEL = "text-[11px] font-semibold uppercase";

export default function AddAdminDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // ถอดออกจาก tree ตอนปิด ฟอร์มจะได้เริ่มจากค่าว่างทุกครั้งที่เปิดใหม่
  if (!open) return null;

  return <AddAdminDialogContent onClose={onClose} />;
}

function AddAdminDialogContent({ onClose }: { onClose: () => void }) {
  const { locale } = useLocale();
  const t = content[locale];
  const createAdmin = useCreateAdmin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = (values: Values) => {
    createAdmin.mutate(values, { onSuccess: onClose });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/40 px-4"
      // ปุ่มยกเลิก disabled ระหว่างส่งอยู่แล้ว การคลิกฉากหลังก็ต้องปิดไม่ได้เหมือนกัน
      onClick={() => {
        if (!createAdmin.isPending) onClose();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
        className="w-full max-w-105 rounded-xl border border-border bg-card p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="font-heading text-base font-bold text-foreground">
          {t.title}
        </div>
        <p className="mt-1.5 text-[13px] text-muted-foreground">{t.intro}</p>

        <div className="mt-4 flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label className={LABEL}>{t.firstName}</Label>
              <Input autoFocus {...register("firstName")} />
              {errors.firstName && (
                <p className="text-xs text-destructive">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Label className={LABEL}>{t.lastName}</Label>
              <Input {...register("lastName")} />
              {errors.lastName && (
                <p className="text-xs text-destructive">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label className={LABEL}>{t.email}</Label>
            <Input type="email" {...register("email")} />
            <Caption>{t.emailHint}</Caption>
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label className={LABEL}>{t.password}</Label>
            <PasswordInput {...register("password")} />
            <Caption>{t.passwordHint}</Caption>
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <Caption>{t.roleNote}</Caption>
          <FormError message={createAdmin.error?.message ?? null} />
        </div>

        <div className="mt-4 flex justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={createAdmin.isPending}
          >
            {t.cancel}
          </Button>
          <Button
            type="submit"
            variant="dark"
            disabled={createAdmin.isPending}
          >
            {createAdmin.isPending ? t.submitting : t.submit}
          </Button>
        </div>
      </form>
    </div>
  );
}

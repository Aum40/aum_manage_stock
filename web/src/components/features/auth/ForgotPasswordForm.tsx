import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordForm() {
  return (
    <div className="flex flex-col gap-4">
      <Alert variant="info">
        <AlertDescription className="text-foreground/80">
          การรีเซ็ตรหัสผ่านจะใช้ได้เฉพาะบัญชีที่มีอีเมลผูกไว้เท่านั้น —
          บัญชีที่ให้เข้าสู่ระบบด้วยอีเมลของเจ้าของร้านเท่านั้น
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-1">
        <Label className="text-[11px] font-semibold tracking-[0.08em] uppercase">
          อีเมลที่ลงทะเบียนไว้
        </Label>
        <Input type="email" placeholder="you@example.com" />
      </div>

      <Button variant="dark" className="w-full py-5">
        ส่งลิงก์รีเซ็ตรหัสผ่าน →
      </Button>

      <div className="text-center">
        <Link href="/login" className="text-[13px] font-bold text-primary">
          ← กลับไปเข้าสู่ระบบ
        </Link>
      </div>
    </div>
  );
}

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SocialButtons from "@/components/features/auth/SocialButtons";

export default function LoginForm() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label className="text-[11px] font-semibold tracking-[0.08em] uppercase">
          อีเมล หรือ Username
        </Label>
        <Input placeholder="aum@example.com หรือ aum.jaingam" />
        <p className="text-xs text-muted-foreground">
          เข้าด้วย username ได้ถ้าบัญชีนี้ตั้งรหัสผ่านไว้แล้ว
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-[11px] font-semibold tracking-[0.08em] uppercase">
          รหัสผ่าน
        </Label>
        <Input type="password" placeholder="••••••••" />
      </div>
      <Button variant="gradient" className="w-full py-5">
        เข้าสู่ระบบ →
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
    </div>
  );
}

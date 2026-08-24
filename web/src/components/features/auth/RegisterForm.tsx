import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SocialButtons from "@/components/features/auth/SocialButtons";

const fields = [
  { label: "ชื่อ", placeholder: "ชื่อจริง", type: "text" },
  { label: "นามสกุล", placeholder: "นามสกุล", type: "text" },
  { label: "อีเมล", placeholder: "you@example.com", type: "email" },
  { label: "รหัสผ่าน", placeholder: "อย่างน้อย 8 ตัวอักษร", type: "password" },
  {
    label: "ยืนยันรหัสผ่าน",
    placeholder: "พิมพ์รหัสผ่านอีกครั้ง",
    type: "password",
  },
] as const;

export default function RegisterForm() {
  return (
    <div className="flex flex-col gap-3.5">
      {fields.map((field) => (
        <div key={field.label} className="flex flex-col gap-1">
          <Label className="text-[11px] font-semibold tracking-[0.08em] uppercase">
            {field.label}
          </Label>
          <Input type={field.type} placeholder={field.placeholder} />
          {field.label === "อีเมล" && (
            <p className="text-xs text-muted-foreground">
              ระบบจะสร้าง username ให้อัตโนมัติจากส่วนหน้าอีเมล
              และอีเมลใช้เข้าสู่ระบบได้เหมือนสมัคร
            </p>
          )}
        </div>
      ))}

      <Button variant="gradient" className="w-full py-5">
        สมัครสมาชิก →
      </Button>

      <SocialButtons mode="register" />

      <div className="text-center text-[13px] text-muted-foreground">
        มีบัญชีแล้ว?{" "}
        <Link href="/login" className="font-bold text-primary">
          เข้าสู่ระบบ
        </Link>
      </div>
    </div>
  );
}

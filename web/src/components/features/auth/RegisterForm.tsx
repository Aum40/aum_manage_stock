"use client";

import Link from "next/link";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FormError } from "@/components/features/auth/form-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SocialButtons from "@/components/features/auth/SocialButtons";
import { resolveApiError } from "@/lib/api-error";
import { registerSchema, type RegisterValues } from "@/lib/validations/auth";

const fields = [
  {
    name: "firstName",
    label: "ชื่อ",
    placeholder: "ชื่อจริง",
    type: "text",
  },
  {
    name: "lastName",
    label: "นามสกุล",
    placeholder: "นามสกุล",
    type: "text",
  },
  {
    name: "email",
    label: "อีเมล",
    placeholder: "you@example.com",
    type: "email",
  },
  {
    name: "password",
    label: "รหัสผ่าน",
    placeholder: "อย่างน้อย 8 ตัวอักษร",
    type: "password",
  },
  {
    name: "confirmPassword",
    label: "ยืนยันรหัสผ่าน",
    placeholder: "พิมพ์รหัสผ่านอีกครั้ง",
    type: "password",
  },
] as const;

export default function RegisterForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterValues) => {
    setFormError(null);

    // confirmPassword ใช้เทียบฝั่งนี้อย่างเดียว api ไม่ได้รับฟิลด์นี้
    // และ ValidationPipe เปิด whitelist ไว้ ส่งไปก็ถูกตัดทิ้งอยู่ดี
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
      }),
    });
    const result = await res.json().catch(() => null);

    if (!res.ok) {
      setFormError(resolveApiError(result, "สมัครสมาชิกไม่สำเร็จ"));
      return;
    }

    // ยังเข้าสู่ระบบไม่ได้จนกว่าจะกดลิงก์ยืนยันในอีเมล (SRS §111 ฝั่ง api
    // บล็อก login ของบัญชีที่ยังไม่ยืนยัน) จึงไม่พาไปหน้าอื่นให้สับสน
    setSentTo(values.email);
  };

  if (sentTo) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="info">
          <AlertDescription className="text-foreground/80">
            ส่งลิงก์ยืนยันไปที่ <strong>{sentTo}</strong> แล้ว
            กรุณากดลิงก์ในอีเมลเพื่อเปิดใช้งานบัญชี
            จากนั้นจึงเข้าสู่ระบบได้ ลิงก์มีอายุ 24 ชั่วโมง
          </AlertDescription>
        </Alert>

        <p className="text-[13px] text-muted-foreground">
          ไม่ได้รับอีเมล? ลองดูในกล่องจดหมายขยะ
          หรือขอลิงก์ใหม่ได้จากหน้าเข้าสู่ระบบ
        </p>

        <Link href="/login">
          <Button variant="gradient" className="w-full py-5">
            ไปหน้าเข้าสู่ระบบ →
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3.5"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      {fields.map((field) => (
        <div key={field.name} className="flex flex-col gap-1">
          <Label
            htmlFor={field.name}
            className="text-[11px] font-semibold tracking-[0.08em] uppercase"
          >
            {field.label}
          </Label>
          <Input
            id={field.name}
            type={field.type}
            placeholder={field.placeholder}
            {...register(field.name)}
          />
          {field.name === "email" && (
            <p className="text-xs text-muted-foreground">
              ระบบจะสร้าง username ให้อัตโนมัติจากส่วนหน้าอีเมล
              และอีเมลใช้เข้าสู่ระบบได้เหมือนสมัคร
            </p>
          )}
          {errors[field.name] && (
            <p className="text-xs text-destructive">
              {errors[field.name]?.message}
            </p>
          )}
        </div>
      ))}

      <FormError message={formError} />

      <Button
        type="submit"
        variant="gradient"
        className="w-full py-5"
        disabled={isSubmitting}
      >
        {isSubmitting ? "กำลังสมัคร..." : "สมัครสมาชิก →"}
      </Button>

      <SocialButtons mode="register" />

      <div className="text-center text-[13px] text-muted-foreground">
        มีบัญชีแล้ว?{" "}
        <Link href="/login" className="font-bold text-primary">
          เข้าสู่ระบบ
        </Link>
      </div>
    </form>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { FormError } from '@/components/features/auth/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resolveApiError } from '@/lib/api-error';
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from '@/lib/validations/auth';

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  if (!token) {
    return (
      <div className="flex flex-col gap-4">
        <FormError message="ลิงก์ไม่ถูกต้อง กรุณาขอลิงก์ตั้งรหัสผ่านใหม่อีกครั้ง" />
        <Link href="/forgot-password" className="text-sm text-primary underline">
          ขอลิงก์ใหม่
        </Link>
      </div>
    );
  }

  const onSubmit = async (values: ResetPasswordValues) => {
    setFormError(null);

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: values.newPassword }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setFormError(resolveApiError(data, 'ตั้งรหัสผ่านใหม่ไม่สำเร็จ'));
      return;
    }

    router.push('/login?reset=1');
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="newPassword">รหัสผ่านใหม่</Label>
        <Input id="newPassword" type="password" {...register('newPassword')} />
        {errors.newPassword && (
          <p className="text-sm text-destructive">
            {errors.newPassword.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</Label>
        <Input
          id="confirmPassword"
          type="password"
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <FormError message={formError} />

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'กำลังบันทึก...' : 'ตั้งรหัสผ่านใหม่'}
      </Button>
    </form>
  );
}

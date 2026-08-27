'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { FormError } from '@/components/features/auth/form-error';
import { PasswordInput } from '@/components/features/auth/PasswordInput';
import { getAuthCopy } from '@/components/features/auth/auth-copy';
import { useLocale } from '@/components/i18n/LocaleContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { resolveApiError } from '@/lib/api-error';
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from '@/lib/validations/auth';

export function ResetPasswordForm({ token }: { token: string | null }) {
  const { locale } = useLocale();
  const text = getAuthCopy(locale).reset;
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
        <FormError message={text.invalid} />
        <Link href="/forgot-password" className="text-sm text-primary underline">
          {text.requestNew}
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
      setFormError(resolveApiError(data, locale === 'th' ? 'ตั้งรหัสผ่านใหม่ไม่สำเร็จ' : 'Unable to reset password'));
      return;
    }

    router.push('/login?reset=1');
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="newPassword">{text.password}</Label>
        <PasswordInput id="newPassword" placeholder={text.placeholder} {...register('newPassword')} showLabel={locale === 'th' ? 'แสดงรหัสผ่าน' : 'Show password'} hideLabel={locale === 'th' ? 'ซ่อนรหัสผ่าน' : 'Hide password'} />
        <p className="text-xs text-muted-foreground">{text.hint}</p>
        {errors.newPassword && (
          <p className="text-sm text-destructive">
            {errors.newPassword.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">{text.confirm}</Label>
        <PasswordInput
          id="confirmPassword"
          placeholder={text.placeholder}
          {...register('confirmPassword')}
          showLabel={locale === 'th' ? 'แสดงรหัสผ่าน' : 'Show password'}
          hideLabel={locale === 'th' ? 'ซ่อนรหัสผ่าน' : 'Hide password'}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <FormError message={formError} />

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? text.submitting : text.submit}
      </Button>
    </form>
  );
}

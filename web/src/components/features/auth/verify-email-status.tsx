'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import { FormError } from '@/components/features/auth/form-error';
import { useLocale } from '@/components/i18n/LocaleContext';
import { buttonVariants } from '@/components/ui/button';
import { resolveApiError } from '@/lib/api-error';
import { cn } from '@/lib/utils';

type Status = 'verifying' | 'success' | 'error';

export function VerifyEmailStatus({ token }: { token: string | null }) {
  const { locale } = useLocale();
  const isThai = locale === 'th';
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'error');
  const [error, setError] = useState<string | null>(
    token ? null : isThai ? 'ลิงก์ยืนยันไม่ถูกต้อง กรุณาตรวจสอบลิงก์ในอีเมลอีกครั้ง' : 'This verification link is invalid. Please check the link in your email.',
  );
  // React รัน effect สองรอบใน dev (Strict Mode) แต่ token ใช้ได้ครั้งเดียว
  // รอบที่สองจะได้ error ทั้งที่รอบแรกสำเร็จ จึงต้องกันไม่ให้ยิงซ้ำ
  const requested = useRef(false);

  useEffect(() => {
    if (!token || requested.current) return;
    requested.current = true;

    const verify = async () => {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(resolveApiError(data, isThai ? 'ยืนยันอีเมลไม่สำเร็จ' : 'Unable to verify email'));
        setStatus('error');
        return;
      }

      setStatus('success');
    };

    void verify();
  }, [isThai, token]);

  if (status === 'verifying') {
    return (
      <p className="text-sm text-muted-foreground">{isThai ? 'กำลังยืนยันอีเมล...' : 'Verifying your email...'}</p>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col gap-4">
        <p
          role="status"
          className="rounded-md border border-status-green/30 bg-status-green/10 px-3 py-2 text-sm text-status-green"
        >
          {isThai ? 'ยืนยันอีเมลเรียบร้อยแล้ว ตอนนี้เข้าสู่ระบบได้เลย' : 'Your email has been verified. You can log in now.'}
        </p>
        <Link href="/login" className={cn(buttonVariants(), 'w-full')}>
          {isThai ? 'ไปหน้าเข้าสู่ระบบ' : 'Go to log in'}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <FormError message={error} />
      <p className="text-sm text-muted-foreground">
        {isThai ? 'ลิงก์อาจหมดอายุหรือถูกใช้ไปแล้ว ขอลิงก์ใหม่ได้จากหน้าเข้าสู่ระบบ' : 'The link may have expired or already been used. Request a new one from the login page.'}
      </p>
      <Link
        href="/login"
        className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
      >
        {isThai ? 'ไปหน้าเข้าสู่ระบบ' : 'Go to log in'}
      </Link>
    </div>
  );
}

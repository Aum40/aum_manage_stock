'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import { FormError } from '@/components/features/auth/form-error';
import { buttonVariants } from '@/components/ui/button';
import { resolveApiError } from '@/lib/api-error';
import { cn } from '@/lib/utils';

type Status = 'verifying' | 'success' | 'error';

export function VerifyEmailStatus({ token }: { token: string | null }) {
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'error');
  const [error, setError] = useState<string | null>(
    token ? null : 'ลิงก์ยืนยันไม่ถูกต้อง กรุณาตรวจสอบลิงก์ในอีเมลอีกครั้ง',
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
        setError(resolveApiError(data, 'ยืนยันอีเมลไม่สำเร็จ'));
        setStatus('error');
        return;
      }

      setStatus('success');
    };

    void verify();
  }, [token]);

  if (status === 'verifying') {
    return (
      <p className="text-sm text-muted-foreground">กำลังยืนยันอีเมล...</p>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col gap-4">
        <p
          role="status"
          className="rounded-md border border-status-green/30 bg-status-green/10 px-3 py-2 text-sm text-status-green"
        >
          ยืนยันอีเมลเรียบร้อยแล้ว ตอนนี้เข้าสู่ระบบได้เลย
        </p>
        <Link href="/login" className={cn(buttonVariants(), 'w-full')}>
          ไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <FormError message={error} />
      <p className="text-sm text-muted-foreground">
        ลิงก์อาจหมดอายุหรือถูกใช้ไปแล้ว ขอลิงก์ใหม่ได้จากหน้าเข้าสู่ระบบ
      </p>
      <Link
        href="/login"
        className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
      >
        ไปหน้าเข้าสู่ระบบ
      </Link>
    </div>
  );
}

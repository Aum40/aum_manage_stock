'use client';

import { useState } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  type QueryClientConfig,
} from '@tanstack/react-query';

import { ApiError } from '@/lib/api-client';

const config: QueryClientConfig = {
  defaultOptions: {
    queries: {
      // ข้อมูลสต็อก/ผู้ใช้เปลี่ยนบ่อย แต่ไม่ถึงกับต้องยิงใหม่ทุกครั้งที่สลับแท็บ
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      /**
       * 4xx คือ "เราส่งอะไรผิด" หรือ "ไม่มีสิทธิ์" — retry กี่ครั้งก็ได้ผลเดิม
       * และยิ่งทำให้ผู้ใช้เห็น error ช้าลง retry เฉพาะ 5xx / network เท่านั้น
       */
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
};

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // สร้างใน state ไม่ใช่ระดับ module — ไม่งั้นทุก request บนเซิร์ฟเวอร์
  // จะใช้ cache ก้อนเดียวกัน ข้อมูลผู้ใช้คนหนึ่งรั่วไปโผล่ที่อีกคนได้
  const [queryClient] = useState(() => new QueryClient(config));

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

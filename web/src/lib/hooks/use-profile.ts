'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { CurrentUser } from '@/lib/types/user';

export const profileKeys = {
  me: ['users', 'me'] as const,
};

export function useMe() {
  return useQuery({
    queryKey: profileKeys.me,
    queryFn: () => api.get<CurrentUser>('/api/users/me'),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: {
      firstName: string;
      lastName: string;
      username?: string;
    }) => api.patch<CurrentUser>('/api/users/me', values),
    // เขียนผลลัพธ์ที่ api ตอบกลับทับ cache เลย จะได้ไม่ต้องยิงซ้ำอีกรอบ
    onSuccess: (updated) => queryClient.setQueryData(profileKeys.me, updated),
  });
}

/**
 * เปลี่ยนรหัสผ่านแล้ว api จะ revoke session ทั้งหมด (users.service.ts) — ผู้ใช้จะหลุด
 * ทันทีเมื่อ access token ตัวปัจจุบันหมดอายุ หน้าเว็บจึงต้องพากลับไป /login เอง
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (values: { oldPassword: string; newPassword: string }) =>
      api.patch<{ message: string }>('/api/users/me/password', values),
  });
}

export function useSetEmailChange() {
  return useMutation({
    mutationFn: (values: { email: string; currentPassword: string }) =>
      api.post<{ message: string }>('/api/auth/email-change', values),
  });
}

/** บัญชีที่ยังไม่เคยมีรหัสผ่าน (สมัครผ่าน LINE/Google) ตั้งครั้งแรกด้วยเส้นนี้ */
export function useSetFirstPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: { newPassword: string }) =>
      api.post<{ message: string }>('/api/users/me/password/set', values),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: profileKeys.me }),
  });
}

export function useUnlinkLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.delete<{ message: string }>('/api/users/me/unlink-line'),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: profileKeys.me }),
  });
}

export function useUnlinkGoogle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.delete<{ message: string }>('/api/users/me/unlink-google'),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: profileKeys.me }),
  });
}

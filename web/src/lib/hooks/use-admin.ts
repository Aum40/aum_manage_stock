'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { api, withQuery } from '@/lib/api-client';
import type {
  AdminOverview,
  AdminShop,
  AdminUser,
  Paginated,
  ShopStatus,
  UserRole,
  UserStatus,
} from '@/lib/types/admin';

/** key เดียวรวมศูนย์ เวลา suspend สำเร็จจะได้ invalidate ทุกตารางที่เกี่ยวได้ครบ */
export const adminKeys = {
  all: ['admin'] as const,
  overview: () => [...adminKeys.all, 'overview'] as const,
  users: (filters: UserFilters) => [...adminKeys.all, 'users', filters] as const,
  shops: (filters: ShopFilters) => [...adminKeys.all, 'shops', filters] as const,
};

/**
 * ขนาดหน้าของทุกตารางฝั่งแอดมิน — api จำกัด limit ไว้ที่ 100 (PaginationQueryDto)
 *
 * เดิมส่งแต่ limit ไม่เคยส่ง page เลย ตารางจึงติดเพดานอยู่ที่หน้าแรกหน้าเดียว
 * ทั้งที่ท้ายตารางโชว์ยอดรวมจริงจาก meta.total — พอผู้ใช้เกิน 50 คนก็เห็นว่ามี
 * 312 บัญชี แต่กดดูได้แค่ 50 คนแรก ไม่มีทางไปต่อ
 */
export const ADMIN_PAGE_SIZE = 50;

export type UserFilters = {
  q?: string;
  role?: UserRole;
  status?: UserStatus;
  page?: number;
};
export type ShopFilters = { q?: string; status?: ShopStatus; page?: number };

export function useAdminOverview() {
  return useQuery({
    queryKey: adminKeys.overview(),
    queryFn: () => api.get<AdminOverview>('/api/backend/admin/overview'),
  });
}

export function useAdminUsers(filters: UserFilters) {
  return useQuery({
    queryKey: adminKeys.users(filters),
    queryFn: () =>
      api.get<Paginated<AdminUser>>(
        withQuery('/api/backend/admin/users', {
          ...filters,
          page: filters.page ?? 1,
          limit: ADMIN_PAGE_SIZE,
        }),
      ),
    // ยังอยู่ในหน้าเดิมตอนพิมพ์ค้นหา ตารางจะได้ไม่กะพริบเป็นช่องว่างทุกตัวอักษร
    placeholderData: (previous) => previous,
  });
}

export function useAdminShops(filters: ShopFilters) {
  return useQuery({
    queryKey: adminKeys.shops(filters),
    queryFn: () =>
      api.get<Paginated<AdminShop>>(
        withQuery('/api/backend/admin/shops', {
          ...filters,
          page: filters.page ?? 1,
          limit: ADMIN_PAGE_SIZE,
        }),
      ),
    placeholderData: (previous) => previous,
  });
}

/**
 * ระงับ/ปลดระงับทั้งบัญชีและร้าน ใช้ hook เดียวกัน ต่างแค่ path
 * ทุกครั้งที่สำเร็จต้องล้าง cache ทั้ง admin — เพราะตัวเลขในหน้าภาพรวม
 * (ผู้ใช้ที่ถูกระงับ / ร้านที่ถูกระงับ) ขยับตามไปด้วยเสมอ
 */
function useAdminAction<TVariables>(
  buildRequest: (variables: TVariables) => {
    path: string;
    body?: unknown;
  },
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: TVariables) => {
      const { path, body } = buildRequest(variables);
      return api.patch<unknown>(path, body);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

export function useSuspendUser() {
  return useAdminAction<{ id: string; reason: string }>(({ id, reason }) => ({
    path: `/api/backend/admin/users/${id}/suspend`,
    body: { reason },
  }));
}

export function useReactivateUser() {
  return useAdminAction<{ id: string }>(({ id }) => ({
    path: `/api/backend/admin/users/${id}/reactivate`,
  }));
}

export function useSuspendShop() {
  return useAdminAction<{ id: string; reason: string }>(({ id, reason }) => ({
    path: `/api/backend/admin/shops/${id}/suspend`,
    body: { reason },
  }));
}

export function useReactivateShop() {
  return useAdminAction<{ id: string }>(({ id }) => ({
    path: `/api/backend/admin/shops/${id}/reactivate`,
  }));
}

/** SRS §29/§186 — Super Admin เท่านั้น (api บังคับด้วย @Roles อีกชั้น) */
export function useCreateAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    }) => api.post<AdminUser>('/api/backend/admin/admins', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

export function useUpdateAdminRole() {
  return useAdminAction<{ id: string; role: 'ADMIN' | 'SUPER_ADMIN' }>(
    ({ id, role }) => ({
      path: `/api/backend/admin/admins/${id}/role`,
      body: { role },
    }),
  );
}

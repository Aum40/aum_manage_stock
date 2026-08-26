'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, withQuery } from '@/lib/api-client';

export type Shop = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  phone?: string | null;
  address?: string | null;
};

export type Product = {
  id: string;
  name: string;
  unit: string;
  categoryId: string | null;
  barcode: string | null;
  imageUrl: string | null;
};

export type ShopProduct = {
  id: string;
  shopId: string;
  productId: string;
  sellPrice: number | string;
  costPrice: number | string;
  stockQty: number;
  lowStockThreshold: number;
  status: 'ACTIVE' | 'INACTIVE';
  product: Pick<Product, 'id' | 'name' | 'barcode' | 'unit' | 'imageUrl' | 'categoryId'>;
};

export type ShopDashboard = {
  range: { from: string; to: string };
  sales: {
    totalAmount: number;
    saleCount: number;
    averageSaleAmount: number;
  };
  stock: { activeProducts: number; lowStock: number; outOfStock: number };
  generatedAt: string;
};

export type BestSeller = {
  rank: number;
  shopProductId: string;
  productName: string;
  quantitySold: number;
  totalAmount: number;
};

export type StockMovement = {
  id: string;
  shopProductId: string;
  actorId: string | null;
  movementType: 'MANUAL_ADJUSTMENT' | 'CHAT_ADJUSTMENT' | 'SALE' | 'SALE_VOID';
  quantityDelta: number;
  quantityBefore: number;
  quantityAfter: number;
  source: 'WEB' | 'LINE';
  note: string | null;
  createdAt: string;
};

type Paginated<T> = {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export const inventoryKeys = {
  all: ['inventory'] as const,
  shops: () => [...inventoryKeys.all, 'shops'] as const,
  products: (params: Record<string, string | number | undefined>) =>
    [...inventoryKeys.all, 'products', params] as const,
  shopProducts: (shopId: string, params: Record<string, string | number | undefined>) =>
    [...inventoryKeys.all, 'shop-products', shopId, params] as const,
};

export function useShops() {
  return useQuery({
    queryKey: inventoryKeys.shops(),
    queryFn: () => api.get<Shop[]>('/api/backend/shops'),
  });
}

export type ShopInput = {
  name: string;
  description?: string;
  imageUrl?: string;
  phone?: string;
  address?: string;
};

export function useCreateShop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ShopInput) => api.post<Shop>('/api/backend/shops', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'me'] });
    },
  });
}

export function useUpdateShop(shopId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ShopInput) => api.patch<Shop>(`/api/backend/shops/${shopId}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export function useDeleteShop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shopId: string) => api.delete(`/api/backend/shops/${shopId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'me'] });
    },
  });
}

export function useProducts(params: { q?: string; categoryId?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: inventoryKeys.products(params),
    queryFn: () => api.get<Paginated<Product>>(withQuery('/api/backend/products', params)),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      name: string;
      unit: string;
      barcode?: string;
      categoryId?: string;
      imageUrl?: string;
    }) => api.post<Product>('/api/backend/products', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export function useShopProducts(
  shopId: string | undefined,
  params: { q?: string; status?: 'ACTIVE' | 'INACTIVE'; page?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: inventoryKeys.shopProducts(shopId ?? 'none', params),
    queryFn: () =>
      api.get<Paginated<ShopProduct>>(
        withQuery(`/api/backend/shops/${shopId}/products`, params),
      ),
    enabled: Boolean(shopId),
  });
}

export function useAddShopProduct(shopId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      productId: string;
      sellPrice: number;
      costPrice: number;
      lowStockThreshold: number;
    }) => api.post(`/api/backend/shops/${shopId}/products`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryKeys.all }),
  });
}

export function useShopDashboard(shopId: string | undefined) {
  return useQuery({
    queryKey: [...inventoryKeys.all, 'dashboard', shopId ?? 'none'],
    queryFn: () => api.get<ShopDashboard>(`/api/backend/shops/${shopId}/dashboard`),
    enabled: Boolean(shopId),
  });
}

export function useBestSellers(shopId: string | undefined) {
  return useQuery({
    queryKey: [...inventoryKeys.all, 'best-sellers', shopId ?? 'none'],
    queryFn: () => api.get<{ items: BestSeller[] }>(`/api/backend/shops/${shopId}/dashboard/best-sellers`),
    enabled: Boolean(shopId),
  });
}

export function useStockMovements(shopId: string | undefined) {
  return useQuery({
    queryKey: [...inventoryKeys.all, 'movements', shopId ?? 'none'],
    queryFn: () =>
      api.get<{ items: StockMovement[]; nextCursor: string | null }>(
        withQuery(`/api/backend/shops/${shopId}/stock/movements`, { limit: 50 }),
      ),
    enabled: Boolean(shopId),
  });
}

export function useAdjustStock(shopId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      shopProductId: string;
      operation: 'INCREASE' | 'DECREASE';
      quantity: number;
      note?: string;
    }) => api.post(`/api/backend/shops/${shopId}/stock/adjust`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export type SellableProduct = {
  shopProductId: string;
  name: string;
  unitPrice: number | string;
};

export function useScanSale(shopId: string | undefined) {
  return useMutation({
    mutationFn: (barcode: string) =>
      api.post<SellableProduct>(`/api/backend/shops/${shopId}/sales/scan`, { barcode }),
  });
}

export function useCreateSale(shopId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { items: { shopProductId: string; quantity: number }[] }) =>
      api.post(`/api/backend/shops/${shopId}/sales`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export type SubscriptionPlan = {
  id: string;
  code: string;
  nameTh: string;
  nameEn?: string | null;
  priceThb: number | string;
  includedShopQuota: number;
  maxActiveProducts: number | null;
  includedStaffQuota: number;
  isFree: boolean;
  chatbotEnabled: boolean;
  barcodeEnabled: boolean;
  aiRecommendationEnabled: boolean;
};

export type SubscriptionSummary = {
  subscription: { status: string; expiresAt: string | null; plan: SubscriptionPlan };
  readOnly: boolean;
  quotas: {
    shop: { used: number; allowed: number; remaining: number; canCreateShop: boolean };
    product: { allowed: number | null; used: number; remaining: number | null };
    staff: { allowed: number; used: number; remaining: number };
  };
};

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => api.get<SubscriptionPlan[]>('/api/backend/subscription-plans'),
  });
}

export function useMySubscription() {
  return useQuery({
    queryKey: ['subscriptions', 'me'],
    queryFn: () => api.get<SubscriptionSummary>('/api/backend/subscriptions/me'),
  });
}

export function useCreateSubscriptionPayment() {
  return useMutation({
    mutationFn: (planCode: 'PLUS' | 'PRO') =>
      api.post<{ paymentId: string; checkoutUrl: string }>(
        '/api/backend/payments/subscription',
        { planCode },
      ),
  });
}

export function useCreateSubscriptionPaymentIntent() {
  return useMutation({
    mutationFn: (planCode: 'PLUS' | 'PRO') =>
      api.post<{ paymentId: string; clientSecret: string }>(
        '/api/backend/payments/subscription-intent',
        { planCode },
      ),
  });
}

export function useRetrySubscriptionPayment() {
  return useMutation({
    mutationFn: (paymentId: string) =>
      api.post<{ paymentId: string; checkoutUrl: string }>(
        `/api/backend/payments/${paymentId}/retry`,
      ),
  });
}

export function useRetrySubscriptionPaymentIntent() {
  return useMutation({
    mutationFn: (paymentId: string) =>
      api.post<{ paymentId: string; clientSecret: string }>(
        `/api/backend/payments/${paymentId}/retry-intent`,
      ),
  });
}

export function useConfirmSubscriptionPayment() {
  return useMutation({
    mutationFn: (paymentId: string) =>
      api.post<{ message: string }>(`/api/backend/payments/${paymentId}/confirm`),
  });
}

export type Payment = {
  id: string;
  amountThb: number | string;
  status: string;
  purpose: string;
  createdAt: string;
  subscription?: { plan?: { nameTh?: string } };
};

export function usePayments() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: () => api.get<Payment[]>('/api/backend/payments'),
  });
}

export type Category = { id: string; name: string; displayOrder: number };

export type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  username: string | null;
  status: string;
  lineUserId?: string | null;
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
  pendingActionId: string | null;
};

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/api/backend/categories'),
  });
}

export function useStaff() {
  return useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get<StaffMember[]>('/api/backend/staff'),
  });
}

export function useStaffQuota() {
  return useQuery({
    queryKey: ['staff', 'quota'],
    queryFn: () => api.get<{ allowed: number; used: number; remaining: number }>('/api/backend/staff/quota'),
  });
}

export type StaffPermission = {
  canManageProduct: boolean;
  canAdjustStockManual: boolean;
  canUseChatbot: boolean;
  canScanSale: boolean;
  canViewDashboard: boolean;
  canViewAiInsight: boolean;
};

export function useShopStaff(shopId: string | undefined) {
  return useQuery({
    queryKey: ['staff', 'shop', shopId],
    queryFn: () => api.get<Array<{ id: string; user: StaffMember; permission: StaffPermission }>>(`/api/backend/shops/${shopId}/staff`),
    enabled: Boolean(shopId),
  });
}

export function useSetStaffPermissions(shopId: string | undefined, staffId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (permissions: StaffPermission) =>
      api.put(`/api/backend/shops/${shopId}/staff/${staffId}/permissions`, permissions),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff', 'shop', shopId] }),
  });
}

/**
 * `enabled` มีไว้ปิดตอนอยู่หน้า admin — บัญชี admin ไม่มีร้าน @OwnerId() ฝั่ง api
 * จึงตอบ 403 ทุกครั้ง ยิงไปก็ได้แค่ error แดงใน console
 */
export function useNotifications(unreadOnly = false, enabled = true) {
  return useQuery({
    enabled,
    queryKey: ['notifications', { unreadOnly }],
    queryFn: () =>
      api.get<{ items: Notification[]; meta: unknown }>(
        withQuery('/api/backend/notifications', { unreadOnly: unreadOnly ? 'true' : undefined }),
      ),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/api/backend/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch('/api/backend/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useChatMessages(shopId: string | undefined) {
  return useQuery({
    queryKey: ['chat', shopId],
    queryFn: () =>
      api.get<ChatMessage[]>(withQuery(`/api/backend/shops/${shopId}/chat/messages`, { limit: 50 })),
    enabled: Boolean(shopId),
  });
}

export function useSendChatMessage(shopId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      api.post<{ pendingAction: unknown; reply: string }>(
        `/api/backend/shops/${shopId}/chat/messages`,
        { content },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat', shopId] }),
  });
}

export function useConfirmChatCommand(shopId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pendingId: string) =>
      api.post(`/api/backend/shops/${shopId}/stock/chat-command/${pendingId}/confirm`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', shopId] });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

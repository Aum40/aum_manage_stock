'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import { api, withQuery } from '@/lib/api-client';

export type Shop = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  phone?: string | null;
  address?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  status: "ACTIVE" | "SUSPENDED";
  pausedAt?: string | null;
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

/**
 * ทุกอย่างที่ทำให้สต็อกหรือยอดขายเปลี่ยน ต้องล้างแคชสองก้อน ไม่ใช่ก้อนเดียว
 *
 * แดชบอร์ดใช้ queryKey ขึ้นต้นด้วย 'dashboard' คนละต้นไม้กับ inventoryKeys
 * และ QueryClient ตั้ง staleTime ไว้ 30 วินาที (query-provider.tsx) ถ้าล้างแค่
 * inventory ผู้ใช้ที่ขายของที่ POS แล้วกดไปหน้าแดชบอร์ดทันทีจะเห็นยอดเก่า
 * ค้างอยู่ครึ่งนาที เหมือนระบบไม่ได้บันทึกบิลให้
 *
 * เขียนเป็นฟังก์ชันกลางเพื่อไม่ให้ต้องจำว่าต้องล้างอะไรบ้างในทุก mutation
 * ที่จะเพิ่มเข้ามาทีหลัง
 */
function invalidateStockAndSales(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['catalog'] });
}

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
  latitude?: number;
  longitude?: number;
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

// เจ้าของพักร้านชั่วคราวเอง — คนละความหมายกับ status=SUSPENDED ที่ Admin
// เป็นคนตั้งเท่านั้น (ดู shops.service.ts) เอนด์พอยต์นี้ปฏิเสธพนักงานเสมอ
export function usePauseShop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shopId: string) => api.patch<Shop>(`/api/backend/shops/${shopId}/pause`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryKeys.all }),
  });
}

export function useResumeShop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shopId: string) => api.patch<Shop>(`/api/backend/shops/${shopId}/resume`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryKeys.all }),
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

export type MovementFilters = {
  /** ISO string — api รับเป็น z.coerce.date() แล้วกรอง createdAt >= from */
  from?: string;
  to?: string;
  shopProductId?: string;
  actorId?: string;
  movementType?: StockMovement['movementType'];
  limit?: number;
};

export function useStockMovements(
  shopId: string | undefined,
  filters: MovementFilters = {},
) {
  return useQuery({
    // filters อยู่ใน key ด้วย เปลี่ยนตัวกรองแล้วต้องยิงใหม่ ไม่ใช่อ่าน cache เดิม
    queryKey: [...inventoryKeys.all, 'movements', shopId ?? 'none', filters],
    queryFn: () =>
      api.get<{ items: StockMovement[]; nextCursor: string | null }>(
        withQuery(`/api/backend/shops/${shopId}/stock/movements`, {
          limit: filters.limit ?? 50,
          from: filters.from,
          to: filters.to,
          shopProductId: filters.shopProductId,
          actorId: filters.actorId,
          movementType: filters.movementType,
        }),
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
    onSuccess: () => invalidateStockAndSales(queryClient),
  });
}

export type SellableProduct = {
  shopProductId: string;
  name: string;
  unitPrice: number | string;
};

// สแกนอย่างเดียวยังไม่เปิดบิล ไม่มีอะไรเปลี่ยนในฐานข้อมูล จึงไม่ต้องล้างแคช
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
    onSuccess: () => invalidateStockAndSales(queryClient),
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

/**
 * ยอดที่ต้องจ่ายจริงมาจาก api เท่านั้น ห้ามเอาราคาป้ายของแพ็กเกจมาแสดงแทน
 * เพราะการอัปเกรดจากแพ็กเกจที่ยังไม่หมดอายุจะเก็บแค่ส่วนต่าง (เช่น PLUS -> PRO
 * = 1,000 ไม่ใช่ 3,499) ถ้าหน้าเว็บโชว์ราคาป้ายจะไม่ตรงกับที่ Stripe ตัดจริง
 */
export type PaymentIntentResult = {
  paymentId: string;
  clientSecret: string;
  amountThb: number;
  fullPriceThb: number;
  /** true = จ่ายเฉพาะส่วนต่าง วันหมดอายุเดิมไม่ขยับ */
  prorated: boolean;
  expiresAt: string;
};

export function useCreateSubscriptionPaymentIntent() {
  return useMutation({
    mutationFn: (planCode: 'PLUS' | 'PRO') =>
      api.post<PaymentIntentResult>(
        '/api/backend/payments/subscription-intent',
        { planCode },
      ),
  });
}

export function useRetrySubscriptionPaymentIntent() {
  return useMutation({
    mutationFn: (paymentId: string) =>
      api.post<PaymentIntentResult>(
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
  /** เวลาที่ใบนี้หมดอายุ (createdAt + 24 ชม.) */
  expiresAt: string;
  /**
   * api เป็นคนตัดสินว่ายังกด "ชำระอีกครั้ง" ได้ไหม ไม่ใช่หน้าเว็บ — ถ้าคำนวณ
   * จาก createdAt เองที่นี่ นาฬิกาเครื่องผู้ใช้ที่เพี้ยนจะทำให้ปุ่มโผล่ทั้งที่
   * api ปฏิเสธไปแล้ว (หรือหายไปทั้งที่ยังจ่ายได้)
   */
  retryable: boolean;
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
  /** ใช้สลับร้านให้ตรงตอนกดเปิดรายการ — api ส่งมาอยู่แล้ว */
  shopId: string | null;
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
      invalidateStockAndSales(queryClient);
    },
  });
}

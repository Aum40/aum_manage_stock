'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, withQuery } from '@/lib/api-client';

/**
 * [อั้ม] AI Recommendations — Pro Plan เท่านั้น
 *
 * list ไม่เรียก LLM มันอ่านจากตารางที่ generate ไว้แล้ว ส่วน generate เป็นตัวที่
 * ยิง LLM จริงและช้า (หลักวินาที) จึงแยกเป็นคนละ endpoint โดยตั้งใจ — ห้าม
 * เรียก generate ตอน render หน้า ไม่งั้นเปิดแดชบอร์ดทีนึงก็เผาโควตา LLM ทีนึง
 */

export type AiRecommendationType = 'RESTOCK' | 'CLEARANCE' | 'PROMOTION';

/** ตัวเลขที่คำแนะนำอ้างอิงตอนถูกสร้าง เก็บไว้ให้ตรวจย้อนหลังได้ */
export type AiRecommendationMetrics = {
  stockQty: number;
  lowStockThreshold: number;
  soldLast30Days: number;
  /** null = ไม่เคยขายเลยสักครั้ง ไม่ใช่ "ขายวันนี้" */
  daysSinceLastSale: number | null;
};

export type AiRecommendation = {
  id: string;
  shopId: string;
  shopProductId: string | null;
  type: AiRecommendationType;
  title: string;
  content: string;
  metrics: AiRecommendationMetrics | null;
  generatedAt: string;
  validUntil: string | null;
  isDismissed: boolean;
};

export const aiRecommendationKeys = {
  all: ['ai-recommendations'] as const,
  list: (shopId: string, includeDismissed: boolean) =>
    [...aiRecommendationKeys.all, shopId, { includeDismissed }] as const,
};

export function useAiRecommendations(
  shopId: string | undefined,
  options: { includeDismissed?: boolean; limit?: number } = {},
) {
  const includeDismissed = options.includeDismissed ?? false;

  return useQuery({
    queryKey: aiRecommendationKeys.list(shopId ?? 'none', includeDismissed),
    queryFn: () =>
      api.get<AiRecommendation[]>(
        withQuery(`/api/backend/shops/${shopId}/ai/recommendations`, {
          includeDismissed: includeDismissed ? 'true' : undefined,
          limit: options.limit,
        }),
      ),
    enabled: Boolean(shopId),
    /**
     * ห้าม retry เมื่อโดนปฏิเสธสิทธิ์ — 403 (ไม่ใช่ Pro) กับ 404 (ไม่ใช่ร้านเรา)
     * ยิงซ้ำอีกกี่รอบก็ได้คำตอบเดิม เสียเวลาผู้ใช้เปล่า ๆ
     */
    retry: (failureCount, error) => {
      const status = (error as { status?: number })?.status;
      if (status === 403 || status === 404) return false;
      return failureCount < 2;
    },
  });
}

export function useGenerateAiRecommendations(shopId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post<AiRecommendation[]>(
        `/api/backend/shops/${shopId}/ai/recommendations/generate`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiRecommendationKeys.all });
    },
  });
}

export function useDismissAiRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    // path นี้ไม่มี shopId — api หา shopId จากตัว recommendation เองแล้วค่อยตรวจสิทธิ์
    mutationFn: (recommendationId: string) =>
      api.patch<AiRecommendation>(
        `/api/backend/ai/recommendations/${recommendationId}/dismiss`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiRecommendationKeys.all });
    },
  });
}

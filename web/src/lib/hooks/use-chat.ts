'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import { inventoryKeys } from '@/lib/hooks/use-inventory';

/**
 * [อั้ม] hook ของ ChatbotModule ที่ use-inventory.ts ยังไม่มี — แยกไฟล์เพื่อไม่ให้
 * สองคนแก้ไฟล์เดียวกันแล้ว conflict
 *
 * ใช้ queryKey ['chat', shopId] ชุดเดียวกับ useChatMessages ใน use-inventory.ts
 * เวลายืนยัน/ยกเลิกเสร็จ ประวัติแชทจะโหลดใหม่เอง
 */

/**
 * ยืนยัน/ยกเลิกรายการที่ค้างอยู่
 *
 * ยิงไปที่ chat/messages ไม่ใช่ stock/chat-command เพราะฝั่ง chat จะบันทึก
 * ข้อความตอบกลับของบอทลงประวัติแชทให้ด้วย (เหมือนฝั่ง LINE ที่ตอบทุกครั้ง)
 */
export function useApplyChatCommand(shopId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      pendingId,
      action,
    }: {
      pendingId: string;
      action: 'CONFIRM' | 'CANCEL';
    }) =>
      api.put<{ reply: string }>(`/api/backend/shops/${shopId}/chat/messages`, {
        pendingActionId: pendingId,
        action,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', shopId] });
      // ยืนยันแล้วสต็อกเปลี่ยนจริง หน้าสินค้า/แดชบอร์ดต้องโหลดใหม่ด้วย
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export type StockCandidate = {
  shopProductId: string;
  name: string;
  unit: string;
  stockQty: number;
};

/**
 * เลือกสินค้าตอนชื่อกำกวม — เติม shopProductId ให้รายการที่ยังว่างอยู่
 *
 * ยิงไปที่ chat/messages ไม่ใช่ stock/chat-command เพราะฝั่ง chat จะบันทึก
 * ข้อความตอบกลับของบอทลงประวัติแชทให้ด้วย ถ้ายิง chat-command ตรงๆ รายการจะ
 * ถูกอัปเดตแต่ประวัติแชทจะจบที่รายการตัวเลือกเฉยๆ ผู้ใช้ไม่รู้ว่าเลือกอะไรไป
 *
 * ฝั่ง LINE ทำเรื่องเดียวกันด้วยการพิมพ์หมายเลข เพราะกดปุ่มไม่ได้
 */
export function useSelectChatCandidate(shopId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      pendingId,
      shopProductId,
    }: {
      pendingId: string;
      shopProductId: string;
    }) =>
      api.patch<{ reply: string }>(
        `/api/backend/shops/${shopId}/chat/messages`,
        { pendingActionId: pendingId, shopProductId },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', shopId] });
    },
  });
}

/**
 * แก้จำนวนก่อนยืนยัน — ฝั่ง LINE ทำไม่ได้ (พิมพ์ใหม่อย่างเดียว) แต่บนเว็บมีปุ่มได้
 * api รับได้ทั้ง quantity / operation / shopProductId ตอนนี้ใช้แค่ quantity
 */
export function useUpdateChatCommand(shopId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      pendingId,
      quantity,
    }: {
      pendingId: string;
      quantity: number;
    }) =>
      api.patch(
        `/api/backend/shops/${shopId}/stock/chat-command/${pendingId}`,
        { quantity },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', shopId] });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

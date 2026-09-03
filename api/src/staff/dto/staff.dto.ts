import { z } from 'zod';

export const assignStaffSchema = z.object({
  shopId: z.uuid(),
});

export type AssignStaffDto = z.infer<typeof assignStaffSchema>;

export const staffPermissionsSchema = z.object({
  canManageProduct: z.boolean(),
  canAdjustStockManual: z.boolean(),
  canUseChatbot: z.boolean(),
  canScanSale: z.boolean(),
  canViewDashboard: z.boolean(),
  canViewAiInsight: z.boolean(),
});

export type StaffPermissionsDto = z.infer<typeof staffPermissionsSchema>;

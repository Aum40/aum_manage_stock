import { z } from 'zod';

export const upgradeSubscriptionSchema = z.object({
  planCode: z.enum(['PLUS', 'PRO'], {
    message: 'planCode must be either PLUS or PRO',
  }),
});

export type UpgradeSubscriptionDto = z.infer<typeof upgradeSubscriptionSchema>;

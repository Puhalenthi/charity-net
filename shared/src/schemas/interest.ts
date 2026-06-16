import { z } from 'zod';
import { TimestampMillisSchema } from './common.js';

export const InterestSchema = z.object({
  charityId: z.string().min(1),
  charityName: z.string().min(1),
  charityLogoUrl: z.string().url().optional(),
  ownerUid: z.string().min(1),
  message: z.string().max(500).optional(),
  createdAt: TimestampMillisSchema,
});
export type Interest = z.infer<typeof InterestSchema>;

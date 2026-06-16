import { z } from 'zod';
import { ITEM_CATEGORIES } from '../enums/index.js';
import { TimestampMillisSchema } from './common.js';

export const WishlistItemSchema = z.object({
  id: z.string().min(1),
  tags: z.array(z.string()).max(30).default([]),
  keywords: z.array(z.string()).max(20).default([]),
  categories: z.array(z.enum(ITEM_CATEGORIES)).default([]),
  notes: z.string().max(500).optional(),
  active: z.boolean().default(true),
  createdAt: TimestampMillisSchema,
  updatedAt: TimestampMillisSchema,
});
export type WishlistItem = z.infer<typeof WishlistItemSchema>;

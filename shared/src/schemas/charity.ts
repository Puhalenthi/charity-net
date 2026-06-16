import { z } from 'zod';
import { CHARITY_STATUSES, ITEM_CATEGORIES } from '../enums/index.js';
import { LocationSchema, TimestampMillisSchema } from './common.js';

export const CharityVerificationSchema = z.object({
  registrationNumber: z.string().max(120).optional(),
  documents: z.array(z.string()).default([]),
  notes: z.string().max(2000).optional(),
});
export type CharityVerification = z.infer<typeof CharityVerificationSchema>;

export const CharitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
  websiteUrl: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  status: z.enum(CHARITY_STATUSES),
  ownerUid: z.string().min(1),
  location: LocationSchema,
  categoriesAccepted: z.array(z.enum(ITEM_CATEGORIES)).default([]),
  verification: CharityVerificationSchema.default({ documents: [] }),
  rejectionReason: z.string().max(2000).optional(),
  approvedAt: TimestampMillisSchema.optional(),
  approvedByUid: z.string().optional(),
  createdAt: TimestampMillisSchema,
  updatedAt: TimestampMillisSchema,
});
export type Charity = z.infer<typeof CharitySchema>;

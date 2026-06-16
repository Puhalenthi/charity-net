import { z } from 'zod';
import { ITEM_CATEGORIES, USER_ROLES } from '../enums/index.js';
import { ImageSchema, LocationSchema } from './common.js';
import { MAX_DESCRIPTION_LENGTH, MAX_IMAGES_PER_ITEM, MAX_TITLE_LENGTH } from '../constants/limits.js';

export const CompleteSignupRequestSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('person'),
    displayName: z.string().min(1).max(100),
    defaultLocation: LocationSchema.optional(),
  }),
  z.object({
    role: z.literal('charity'),
    displayName: z.string().min(1).max(100),
    charityName: z.string().min(1).max(200),
    description: z.string().max(2000).default(''),
    websiteUrl: z.string().url().optional(),
    location: LocationSchema,
    categoriesAccepted: z.array(z.enum(ITEM_CATEGORIES)).default([]),
    registrationNumber: z.string().max(120).optional(),
    documents: z.array(z.string()).max(10).default([]),
  }),
]);
export type CompleteSignupRequest = z.infer<typeof CompleteSignupRequestSchema>;

export const CreateItemRequestSchema = z.object({
  title: z.string().min(1).max(MAX_TITLE_LENGTH),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).default(''),
  images: z.array(ImageSchema).min(1).max(MAX_IMAGES_PER_ITEM),
  location: LocationSchema,
});
export type CreateItemRequest = z.infer<typeof CreateItemRequestSchema>;

export const FinalizeRecipientRequestSchema = z.object({
  charityId: z.string().min(1),
});
export type FinalizeRecipientRequest = z.infer<typeof FinalizeRecipientRequestSchema>;

export const ExpressInterestRequestSchema = z.object({
  message: z.string().max(500).optional(),
});
export type ExpressInterestRequest = z.infer<typeof ExpressInterestRequestSchema>;

export const UpdateWishlistRequestSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().optional(),
      tags: z.array(z.string()).max(30).default([]),
      keywords: z.array(z.string()).max(20).default([]),
      categories: z.array(z.enum(ITEM_CATEGORIES)).default([]),
      notes: z.string().max(500).optional(),
      active: z.boolean().default(true),
    }),
  ),
});
export type UpdateWishlistRequest = z.infer<typeof UpdateWishlistRequestSchema>;

export const ApproveCharityRequestSchema = z.object({
  notes: z.string().max(2000).optional(),
});
export type ApproveCharityRequest = z.infer<typeof ApproveCharityRequestSchema>;

export const RejectCharityRequestSchema = z.object({
  reason: z.string().min(1).max(2000),
});
export type RejectCharityRequest = z.infer<typeof RejectCharityRequestSchema>;

export const RoleSchema = z.enum(USER_ROLES);

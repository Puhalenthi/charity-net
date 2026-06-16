import { z } from 'zod';
import {
  AI_STATUSES,
  ITEM_CATEGORIES,
  ITEM_CONDITIONS,
  ITEM_STATUSES,
} from '../enums/index.js';
import { ImageSchema, LocationSchema, TimestampMillisSchema } from './common.js';
import {
  MAX_AI_KEYWORDS,
  MAX_AI_TAGS,
  MAX_DESCRIPTION_LENGTH,
  MAX_IMAGES_PER_ITEM,
  MAX_TITLE_LENGTH,
} from '../constants/limits.js';

export const AiSafetySchema = z.object({
  nsfw: z.boolean().default(false),
  weapon: z.boolean().default(false),
  hazardous: z.boolean().default(false),
  pii: z.boolean().default(false),
});
export type AiSafety = z.infer<typeof AiSafetySchema>;

export const ItemSchema = z.object({
  id: z.string().min(1),
  ownerUid: z.string().min(1),
  title: z.string().min(1).max(MAX_TITLE_LENGTH),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).default(''),
  images: z.array(ImageSchema).min(1).max(MAX_IMAGES_PER_ITEM),
  location: LocationSchema,
  aiStatus: z.enum(AI_STATUSES).default('pending'),
  aiCategory: z.enum(ITEM_CATEGORIES).optional(),
  aiCondition: z.enum(ITEM_CONDITIONS).optional(),
  aiTags: z.array(z.string()).max(MAX_AI_TAGS).default([]),
  aiKeywords: z.array(z.string()).max(MAX_AI_KEYWORDS).default([]),
  aiSafety: AiSafetySchema.default({ nsfw: false, weapon: false, hazardous: false, pii: false }),
  aiRaw: z.unknown().optional(),
  status: z.enum(ITEM_STATUSES).default('draft'),
  interestDeadline: TimestampMillisSchema,
  interestCount: z.number().int().nonnegative().default(0),
  selectedCharityId: z.string().optional(),
  selectedAt: TimestampMillisSchema.optional(),
  createdAt: TimestampMillisSchema,
  updatedAt: TimestampMillisSchema,
});
export type Item = z.infer<typeof ItemSchema>;

import { z } from 'zod';
import { USER_ROLES } from '../enums/index.js';
import { LocationSchema, NotificationPrefsSchema, TimestampMillisSchema } from './common.js';
import {
  DEFAULT_SEARCH_RADIUS_KM,
  MAX_SEARCH_RADIUS_KM,
  MIN_SEARCH_RADIUS_KM,
} from '../constants/limits.js';

export const UserSchema = z.object({
  uid: z.string().min(1),
  role: z.enum(USER_ROLES),
  displayName: z.string().min(1).max(100),
  email: z.string().email(),
  photoURL: z.string().url().optional(),
  defaultLocation: LocationSchema.optional(),
  searchRadiusKm: z
    .number()
    .min(MIN_SEARCH_RADIUS_KM)
    .max(MAX_SEARCH_RADIUS_KM)
    .default(DEFAULT_SEARCH_RADIUS_KM),
  notificationPrefs: NotificationPrefsSchema.default({ email: true, inApp: true }),
  charityId: z.string().optional(),
  createdAt: TimestampMillisSchema,
  updatedAt: TimestampMillisSchema,
});
export type User = z.infer<typeof UserSchema>;

export const CustomClaimsSchema = z.object({
  role: z.enum(USER_ROLES),
  approved: z.boolean(),
  charityId: z.string().optional(),
});
export type CustomClaims = z.infer<typeof CustomClaimsSchema>;

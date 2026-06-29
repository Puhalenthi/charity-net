import { z } from 'zod';

export const TimestampMillisSchema = z.number().int().nonnegative();
export type TimestampMillis = z.infer<typeof TimestampMillisSchema>;

export const LocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  geohash: z.string().min(1).max(20),
  city: z.string().max(120).optional(),
  postalCode: z.string().max(20).optional(),
  countryCode: z.string().length(2).optional(),
  addressLine: z.string().max(200).optional(),
});
export type Location = z.infer<typeof LocationSchema>;

export const ImageSchema = z.object({
  path: z.string().min(1),
  url: z.string().url(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});
export type Image = z.infer<typeof ImageSchema>;

export const NotificationPrefsSchema = z.object({
  inApp: z.boolean().default(true),
});
export type NotificationPrefs = z.infer<typeof NotificationPrefsSchema>;

import { z } from 'zod';
import { NOTIFICATION_TYPES } from '../enums/index.js';
import { TimestampMillisSchema } from './common.js';

export const NotificationSchema = z.object({
  id: z.string().min(1),
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string().min(1).max(200),
  body: z.string().max(1000).default(''),
  itemId: z.string().optional(),
  threadId: z.string().optional(),
  charityId: z.string().optional(),
  read: z.boolean().default(false),
  createdAt: TimestampMillisSchema,
});
export type Notification = z.infer<typeof NotificationSchema>;

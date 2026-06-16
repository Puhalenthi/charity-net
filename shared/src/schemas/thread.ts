import { z } from 'zod';
import { MAX_MESSAGE_LENGTH } from '../constants/limits.js';
import { TimestampMillisSchema } from './common.js';

export const ThreadSchema = z.object({
  id: z.string().min(1),
  itemId: z.string().min(1),
  ownerUid: z.string().min(1),
  charityId: z.string().min(1),
  charityOwnerUid: z.string().min(1),
  participants: z.array(z.string()).length(2),
  lastMessage: z
    .object({
      text: z.string().max(MAX_MESSAGE_LENGTH),
      fromUid: z.string().min(1),
      createdAt: TimestampMillisSchema,
    })
    .optional(),
  unread: z.record(z.string(), z.number().int().nonnegative()).default({}),
  closed: z.boolean().default(false),
  createdAt: TimestampMillisSchema,
});
export type Thread = z.infer<typeof ThreadSchema>;

export const MessageSchema = z.object({
  id: z.string().min(1),
  threadId: z.string().min(1),
  fromUid: z.string().min(1),
  text: z.string().min(1).max(MAX_MESSAGE_LENGTH),
  createdAt: TimestampMillisSchema,
});
export type Message = z.infer<typeof MessageSchema>;

export function makeThreadId(itemId: string, charityId: string): string {
  return `${itemId}_${charityId}`;
}

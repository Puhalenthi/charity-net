export const USER_ROLES = ['person', 'charity', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const CHARITY_STATUSES = ['pending', 'approved', 'rejected', 'suspended'] as const;
export type CharityStatus = (typeof CHARITY_STATUSES)[number];

export const ITEM_STATUSES = [
  'draft',
  'active',
  'reserved',
  'given',
  'expired',
  'removed',
] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const AI_STATUSES = ['pending', 'done', 'failed', 'flagged'] as const;
export type AiStatus = (typeof AI_STATUSES)[number];

export const ITEM_CATEGORIES = [
  'furniture',
  'clothing',
  'kids',
  'electronics',
  'kitchen',
  'books',
  'sports',
  'tools',
  'toys',
  'bedding',
  'appliances',
  'baby',
  'medical-aids',
  'garden',
  'office',
  'art',
  'music-instruments',
  'pet-supplies',
  'crafts',
  'jewelry',
  'shoes',
  'bags',
  'food-non-perishable',
  'beauty',
  'other',
] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const ITEM_CONDITIONS = ['new', 'like-new', 'good', 'fair', 'broken'] as const;
export type ItemCondition = (typeof ITEM_CONDITIONS)[number];

export const NOTIFICATION_TYPES = [
  'wishlist_match',
  'new_interest',
  'selected_as_recipient',
  'not_selected',
  'new_message',
  'charity_approved',
  'charity_rejected',
  'item_expired',
  'item_removed',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

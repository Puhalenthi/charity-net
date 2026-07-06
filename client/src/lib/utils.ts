import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Coerce anything we might receive for a timestamp into epoch millis. Our data
// model stores millis (numbers), but a Firestore Timestamp can leak through
// (e.g. legacy docs written with serverTimestamp()); left raw it renders as a
// nonsense "19900d ago".
export function toMillis(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === 'object') {
    const v = value as { toMillis?: () => number; seconds?: number; _seconds?: number };
    if (typeof v.toMillis === 'function') return v.toMillis();
    const seconds = v.seconds ?? v._seconds;
    if (typeof seconds === 'number') return seconds * 1000;
  }
  return Date.now();
}

export function formatRelative(input: number | unknown): string {
  const ms = toMillis(input);
  const diff = ms - Date.now();
  const abs = Math.abs(diff);
  const sign = diff < 0 ? 'ago' : 'left';
  if (abs < 60_000) return diff < 0 ? 'just now' : 'soon';
  const minutes = Math.floor(abs / 60_000);
  if (minutes < 60) return `${minutes}m ${sign}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${sign}`;
  const days = Math.floor(hours / 24);
  return `${days}d ${sign}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

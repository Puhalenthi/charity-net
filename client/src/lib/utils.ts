import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatRelative(ms: number): string {
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

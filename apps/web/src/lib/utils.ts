import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency = 'INR') {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatCurrencyShort(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  if (num >= 10_000_000) return `₹${(num / 10_000_000).toFixed(2)} Cr`;
  if (num >= 100_000) return `₹${(num / 100_000).toFixed(1)} L`;
  return `₹${num.toLocaleString('en-IN')}`;
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(date));
}

export function timeAgo(date: string | Date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/** Replace all raw enum string displays — "IN_PROGRESS" → "In Progress" */
export function humanize(str: string): string {
  if (!str) return '';
  return str.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

/** Days since a past date (positive = past, negative = future) */
export function daysAgo(date: string | Date): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

/** Tailwind classes for bill aging badge */
export function agingColor(days: number): string {
  if (days > 60) return 'bg-red-100 text-red-700 font-bold';
  if (days > 30) return 'bg-red-100 text-red-700';
  if (days > 15) return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCurrencyCr(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`
  return formatCurrency(amount)
}

export function formatDate(dateStr: string, fmt = 'dd MMM yyyy'): string {
  try {
    return format(parseISO(dateStr), fmt)
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy HH:mm')
  } catch {
    return dateStr
  }
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    pending_approval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    won: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    lost: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    on_hold: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    planning: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    confirmed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    dispatched: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    matched: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    discrepancy: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }
  return map[status] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
}

export function getPriorityColor(priority: string): string {
  const map: Record<string, string> = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
  }
  return map[priority] ?? 'bg-gray-100 text-gray-700'
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '…'
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

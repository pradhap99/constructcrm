/**
 * Date helpers. en-IN locale (dd MMM yyyy). All inputs accept ISO date
 * strings (YYYY-MM-DD) or full ISO timestamps; output is human-friendly.
 */

const DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const DATETIME_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return DATE_FORMATTER.format(d)
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return DATETIME_FORMATTER.format(d)
}

export function daysAgo(value: string | Date | null | undefined): number {
  if (!value) return 0
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return 0
  return Math.floor((Date.now() - d.getTime()) / 86_400_000)
}

export function daysUntil(value: string | Date | null | undefined): number {
  if (!value) return 0
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return 0
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000)
}

/** Today's date as a YYYY-MM-DD string in the local timezone. */
export function todayISO(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

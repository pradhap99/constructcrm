import { cn } from '@/lib/utils'
import type { ClientType } from '@/lib/zod-schemas'

const STYLES: Record<ClientType, string> = {
  Government: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  Private: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  PSU: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  PPP: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
}

export function ClientTypeBadge({ type, className }: { type: ClientType; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        STYLES[type],
        className,
      )}
    >
      {type}
    </span>
  )
}

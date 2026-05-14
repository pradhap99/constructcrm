'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ExternalLink, MoreVertical, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatINR, formatINRShort } from '@/lib/currency'
import { formatDate } from '@/lib/date'
import { agingBucket, billAgingDays } from '@/lib/bill-math'
import { BillStatusChanger } from './bill-status-changer'
import { WhatsAppShareButton } from './whatsapp-share'
import { deleteBillAction } from '@/actions/bills'
import type { BillRow as BillRowData } from '@/actions/bills'

const AGE_COLOR: Record<ReturnType<typeof agingBucket>, string> = {
  normal: 'text-muted-foreground',
  watch: 'text-amber-600 dark:text-amber-400',
  overdue: 'text-orange-600 dark:text-orange-400',
  critical: 'text-rose-600 dark:text-rose-400',
}

export function BillRow({ bill }: { bill: BillRowData }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [, startTransition] = useTransition()

  const aging = billAgingDays({
    status: bill.status,
    submittedDate: bill.submittedDate,
    certifiedDate: bill.certifiedDate,
  })
  const bucket = agingBucket(aging)

  const net = Number(bill.netAmount)
  const paid = Number(bill.paidAmount ?? 0)
  const outstanding = Math.max(net - paid, 0)
  const isPaid = bill.status === 'PAID'

  const onDelete = () => {
    if (!confirm(`Delete bill ${bill.billNumber}? This cannot be undone.`)) return
    startTransition(async () => {
      await deleteBillAction(bill.id)
    })
  }

  return (
    <article className="grid grid-cols-1 gap-3 rounded-lg border bg-card p-3 text-card-foreground shadow-sm sm:grid-cols-12 sm:items-center">
      <div className="sm:col-span-3">
        <p className="font-mono text-xs font-semibold">{bill.billNumber}</p>
        <p className="text-[10px] text-muted-foreground">
          {formatDate(bill.billDate)} · {bill.clientName}
        </p>
      </div>

      <Link
        href={`/projects/${bill.projectId}`}
        className="text-xs hover:underline sm:col-span-3"
      >
        <span className="font-medium">{bill.projectName}</span>
        <span className="ml-1 font-mono text-[10px] text-muted-foreground">
          {bill.projectCode}
        </span>
      </Link>

      <div className="sm:col-span-1">
        <BillStatusChanger billId={bill.id} initial={bill.status} netAmount={net} />
      </div>

      <div className="sm:col-span-1 sm:text-right">
        <p className="text-xs font-semibold">{formatINR(net)}</p>
        <p className="text-[10px] text-muted-foreground">net</p>
      </div>

      <div className="sm:col-span-1 sm:text-right">
        {aging > 0 ? (
          <>
            <p className={cn('text-xs font-medium', AGE_COLOR[bucket])}>{aging}d</p>
            <p className="text-[10px] text-muted-foreground">
              {bill.status === 'CERTIFIED' ? 'since cert' : 'since sub'}
            </p>
          </>
        ) : (
          <p className="text-[10px] text-muted-foreground">—</p>
        )}
      </div>

      <div className="sm:col-span-2 sm:text-right">
        {isPaid ? (
          <p className="text-xs text-emerald-700 dark:text-emerald-400">Paid in full</p>
        ) : (
          <>
            <p className="text-xs font-semibold">{formatINRShort(outstanding)}</p>
            <p className="text-[10px] text-muted-foreground">outstanding</p>
          </>
        )}
      </div>

      <div className="flex items-center justify-end gap-1 sm:col-span-1">
        <WhatsAppShareButton bill={bill} />
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="More actions"
            className="rounded-sm p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                <Link
                  href={`/projects/${bill.projectId}`}
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open project
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onDelete()
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete bill
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  )
}

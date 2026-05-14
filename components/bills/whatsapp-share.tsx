'use client'

import { MessageCircle } from 'lucide-react'
import { formatINRShort } from '@/lib/currency'
import { formatDate } from '@/lib/date'
import { BILL_STATUS_LABELS } from './bill-status-pill'
import type { BillRow } from '@/actions/bills'

/**
 * "Share to WhatsApp" deep-link per the §7.5 message format:
 *   {billNumber} · {projectName} · ₹{netAmount} net · status: {status} ({date})
 */
export function WhatsAppShareButton({ bill }: { bill: BillRow }) {
  const date = formatDate(bill.submittedDate ?? bill.billDate)
  const text = `${bill.billNumber} · ${bill.projectName} · ₹${formatINRShort(
    Number(bill.netAmount),
  )} net · status: ${BILL_STATUS_LABELS[bill.status]} (${date})`
  const href = `https://wa.me/?text=${encodeURIComponent(text)}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="Share to WhatsApp"
      className="inline-flex items-center gap-1 rounded-sm border bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    >
      <MessageCircle className="h-3 w-3" />
      WhatsApp
    </a>
  )
}

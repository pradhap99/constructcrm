'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { updateClientNotesAction } from '@/actions/clients'

/**
 * Save-on-blur notes editor per the global "no save buttons" convention
 * from §8. Also fires a debounced background save 1.5s after the user
 * stops typing so an accidental tab-close doesn't lose recent edits.
 */
export function NotesEditor({ clientId, initialNotes }: { clientId: string; initialNotes: string | null }) {
  const [value, setValue] = useState(initialNotes ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [, startTransition] = useTransition()
  const lastSaved = useRef(initialNotes ?? '')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = (next: string) => {
    if (next === lastSaved.current) return
    setStatus('saving')
    startTransition(async () => {
      try {
        await updateClientNotesAction({ id: clientId, notes: next.length === 0 ? null : next })
        lastSaved.current = next
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 1200)
      } catch {
        setStatus('idle')
      }
    })
  }

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (value === lastSaved.current) return
    timer.current = setTimeout(() => save(value), 1500)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Notes
        </p>
        <SaveIndicator status={status} />
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={(e) => save(e.target.value)}
        placeholder="Payment cycles, key contacts, on-site dos and don'ts…"
        className="min-h-[120px]"
        maxLength={2000}
      />
    </div>
  )
}

function SaveIndicator({ status }: { status: 'idle' | 'saving' | 'saved' }) {
  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Saving
      </span>
    )
  }
  if (status === 'saved') {
    return (
      <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
        <Check className="h-3 w-3" /> Saved
      </span>
    )
  }
  return null
}

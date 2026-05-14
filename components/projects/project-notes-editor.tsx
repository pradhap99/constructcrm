'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { updateProjectNotesAction } from '@/actions/projects'

/** Save-on-blur project notes textarea (mirror of the clients NotesEditor). */
export function ProjectNotesEditor({
  projectId,
  initialNotes,
}: {
  projectId: string
  initialNotes: string | null
}) {
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
        await updateProjectNotesAction({
          id: projectId,
          notes: next.length === 0 ? null : next,
        })
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
        {status === 'saving' && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving
          </span>
        )}
        {status === 'saved' && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
            <Check className="h-3 w-3" /> Saved
          </span>
        )}
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={(e) => save(e.target.value)}
        placeholder="Site-specific notes, client preferences, anything worth remembering…"
        className="min-h-[160px]"
        maxLength={2000}
      />
    </div>
  )
}

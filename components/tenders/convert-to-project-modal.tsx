'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { convertTenderToProjectAction } from '@/actions/tenders'
import { todayISO } from '@/lib/date'
import type { TenderRow } from '@/actions/tenders'

type ClientOption = { id: string; name: string }

export function ConvertToProjectModal({
  tender,
  clients,
  open,
  onOpenChange,
}: {
  tender: TenderRow
  clients: ClientOption[]
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const defaultValue = Number(tender.bidValue ?? tender.estimatedValue ?? 0)
  const defaultStart = todayISO()
  const initialClientId = tender.clientId ?? ''

  useEffect(() => {
    if (open) {
      setError(null)
      setSubmitting(false)
    }
  }, [open])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const payload = {
      tenderId: tender.id,
      clientId: String(fd.get('clientId') ?? ''),
      name: String(fd.get('name') ?? ''),
      code: String(fd.get('code') ?? ''),
      contractValue: Number(fd.get('contractValue') ?? 0),
      startDate: String(fd.get('startDate') ?? ''),
      endDate: String(fd.get('endDate') ?? ''),
    }
    setSubmitting(true)
    startTransition(async () => {
      const result = await convertTenderToProjectAction(payload)
      setSubmitting(false)
      if (result.ok) {
        onOpenChange(false)
        router.push(`/projects/${result.projectId}`)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert to project?</DialogTitle>
          <DialogDescription>
            Pre-filled from the tender. Tweak anything that needs tweaking, then create.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="clientId">Client</Label>
            <select
              id="clientId"
              name="clientId"
              required
              defaultValue={initialClientId}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="" disabled>
                Pick a client
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {!tender.clientId && (
              <p className="text-[10px] text-muted-foreground">
                This tender wasn&rsquo;t linked to a client; pick one now.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Project name</Label>
              <Input id="name" name="name" required defaultValue={tender.name} maxLength={160} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                name="code"
                required
                defaultValue={tender.referenceNumber ?? ''}
                maxLength={40}
                placeholder="MCR-S3"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="contractValue">Contract value (₹)</Label>
              <Input
                id="contractValue"
                name="contractValue"
                type="number"
                required
                min={0}
                step={1}
                inputMode="numeric"
                defaultValue={defaultValue || ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                required
                defaultValue={defaultStart}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">End date</Label>
              <Input id="endDate" name="endDate" type="date" required />
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Maybe later
            </Button>
            <Button type="submit" disabled={submitting} className="gap-1.5">
              {submitting ? 'Creating…' : (
                <>
                  Create project <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

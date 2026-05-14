'use client'

import { useEffect, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { AlertCircle, Plus } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { CLIENT_TYPES, TENDER_STATUSES } from '@/lib/zod-schemas'
import { TENDER_STATUS_LABELS } from './tender-status-utils'
import { createTenderAction } from '@/actions/tenders'

type ClientOption = { id: string; name: string }

export function CreateTenderButton({
  clients,
  presetClientId,
}: {
  clients: ClientOption[]
  presetClientId?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        New tender
      </Button>
      <CreateTenderModal
        open={open}
        onOpenChange={setOpen}
        clients={clients}
        presetClientId={presetClientId}
      />
    </>
  )
}

function CreateTenderModal({
  open,
  onOpenChange,
  clients,
  presetClientId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  clients: ClientOption[]
  presetClientId?: string
}) {
  const router = useRouter()
  const [state, formAction] = useFormState(createTenderAction, null)

  useEffect(() => {
    if (state?.ok) {
      onOpenChange(false)
      router.refresh()
    }
  }, [state, onOpenChange, router])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New tender</DialogTitle>
          <DialogDescription>
            Track the bid from EOI through WON or LOST. Link a client if you have one — you can
            also add it later.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Tender name</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Bengaluru Metro — Pink Line P2"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="type">Client type</Label>
              <select
                id="type"
                name="type"
                required
                defaultValue=""
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="" disabled>
                  Pick a type
                </option>
                {CLIENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Stage</Label>
              <select
                id="status"
                name="status"
                defaultValue="EOI"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {TENDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {TENDER_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="clientId">Client (optional)</Label>
            <select
              id="clientId"
              name="clientId"
              defaultValue={presetClientId ?? ''}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">— No client yet —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="estimatedValue">Estimated value (₹)</Label>
              <Input
                id="estimatedValue"
                name="estimatedValue"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                placeholder="50000000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bidValue">Your bid (₹, optional)</Label>
              <Input
                id="bidValue"
                name="bidValue"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="submissionDate">Submission deadline</Label>
              <Input id="submissionDate" name="submissionDate" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="referenceNumber">Reference / RFP no.</Label>
              <Input id="referenceNumber" name="referenceNumber" maxLength={80} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs">
              Notes (optional)
            </Label>
            <Textarea id="notes" name="notes" className="min-h-[60px]" />
          </div>

          {state && !state.ok && (
            <p
              role="alert"
              className="flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creating…' : 'Create tender'}
    </Button>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ArrowRight, Plus } from 'lucide-react'
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
import { PROJECT_STATUSES } from '@/lib/zod-schemas'
import { PROJECT_STATUS_LABELS } from './project-status-badge'
import { todayISO } from '@/lib/date'
import { createProjectAction } from '@/actions/projects'

type ClientOption = { id: string; name: string }

export function CreateProjectButton({
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
        New project
      </Button>
      <CreateProjectModal
        open={open}
        onOpenChange={setOpen}
        clients={clients}
        presetClientId={presetClientId}
      />
    </>
  )
}

function CreateProjectModal({
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
  const [state, formAction] = useFormState(createProjectAction, null)

  useEffect(() => {
    if (state?.ok) {
      onOpenChange(false)
      router.push(`/projects/${state.id}`)
    }
  }, [state, onOpenChange, router])

  const hasClients = clients.length > 0
  const defaultStart = todayISO()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Projects belong to a client. Bills and variations live under projects.
          </DialogDescription>
        </DialogHeader>

        {!hasClients ? (
          <div className="rounded-md border border-dashed border-border bg-muted/40 p-4 text-sm">
            <p className="font-medium">No clients yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              A project always belongs to a client. Add one, then come back here.
            </p>
            <Link
              href="/clients"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Create a client first
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="clientId">Client</Label>
              <select
                id="clientId"
                name="clientId"
                required
                defaultValue={presetClientId ?? ''}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Project name</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="Mumbai Coastal Road — Segment 3"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="code">Code</Label>
                <Input id="code" name="code" required placeholder="MCR-S3" maxLength={40} />
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
                  placeholder="12500000"
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

            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue="IN_PROGRESS"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PROJECT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="siteAddress" className="text-xs">
                Site address (optional)
              </Label>
              <Textarea
                id="siteAddress"
                name="siteAddress"
                placeholder="Where work happens"
                className="min-h-[60px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs">
                Scope description (optional)
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Short description of work, deliverables, etc."
                className="min-h-[60px]"
              />
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
        )}
      </DialogContent>
    </Dialog>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creating…' : 'Create project'}
    </Button>
  )
}

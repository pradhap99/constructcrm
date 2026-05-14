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
import { CLIENT_TYPES } from '@/lib/zod-schemas'
import { createClientAction } from '@/actions/clients'

export function CreateClientButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        New client
      </Button>
      <CreateClientModal open={open} onOpenChange={setOpen} />
    </>
  )
}

function CreateClientModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const router = useRouter()
  const [state, formAction] = useFormState(createClientAction, null)

  useEffect(() => {
    if (state?.ok) {
      onOpenChange(false)
      // Hop into the new client's detail page so the user can flesh it out.
      router.push(`/clients/${state.id}`)
    }
  }, [state, onOpenChange, router])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New client</DialogTitle>
          <DialogDescription>
            Start with a name and a type. You can add contacts, GST, and projects from the detail
            page.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Client name</Label>
            <Input id="name" name="name" required placeholder="NHAI Mumbai Division" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="type">Type</Label>
            <select
              id="type"
              name="type"
              required
              defaultValue=""
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled>
                Select a type
              </option>
              {CLIENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="gstNumber" className="text-xs">
                GST number
              </Label>
              <Input
                id="gstNumber"
                name="gstNumber"
                placeholder="29ABCDE1234F1Z5"
                maxLength={15}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="panNumber" className="text-xs">
                PAN number
              </Label>
              <Input id="panNumber" name="panNumber" placeholder="ABCDE1234F" maxLength={10} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-xs">
              Address
            </Label>
            <Textarea
              id="address"
              name="address"
              placeholder="Street, City, State, PIN"
              className="min-h-[60px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs">
              Notes (optional)
            </Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Anything worth remembering — payment terms, contact preferences…"
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
      </DialogContent>
    </Dialog>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creating…' : 'Create client'}
    </Button>
  )
}

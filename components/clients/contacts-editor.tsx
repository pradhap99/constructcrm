'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateClientContactsAction } from '@/actions/clients'
import type { ClientContact } from '@/lib/zod-schemas'

type Status = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Click "Add contact" → row appears. On blur of any field the whole list is
 * persisted. Delete fires its save immediately. Aligns with the spec's
 * "Inline-edit contacts list (Radix Popover or inline form, no modal)" §7.2
 * and the global save-on-blur convention from §8.
 */
export function ContactsEditor({
  clientId,
  initial,
}: {
  clientId: string
  initial: ClientContact[]
}) {
  const [contacts, setContacts] = useState<ClientContact[]>(initial)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const persist = (next: ClientContact[]) => {
    setStatus('saving')
    setError(null)
    startTransition(async () => {
      const result = await updateClientContactsAction({ id: clientId, contacts: next })
      if (result.ok) {
        setContacts(result.contacts)
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 1200)
      } else {
        setStatus('error')
        setError(result.error)
      }
    })
  }

  const update = (index: number, patch: Partial<ClientContact>) => {
    setContacts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    )
  }

  const addContact = () => {
    setContacts((prev) => [...prev, { name: '' }])
  }

  const removeContact = (index: number) => {
    const next = contacts.filter((_, i) => i !== index)
    setContacts(next)
    persist(next)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Contacts
        </p>
        <SaveIndicator status={status} />
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      {contacts.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No contacts yet. Add the people you actually call when bills run late.
        </p>
      )}

      <ul className="space-y-3">
        {contacts.map((contact, i) => (
          <li key={i} className="rounded-md border bg-card p-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Field
                label="Name"
                value={contact.name}
                onChange={(v) => update(i, { name: v })}
                onBlur={() => persist(contacts)}
                placeholder="Rajesh Iyer"
                required
              />
              <Field
                label="Role"
                value={contact.role ?? ''}
                onChange={(v) => update(i, { role: v })}
                onBlur={() => persist(contacts)}
                placeholder="Site engineer"
              />
              <Field
                label="Phone"
                value={contact.phone ?? ''}
                onChange={(v) => update(i, { phone: v })}
                onBlur={() => persist(contacts)}
                placeholder="+91 98765 43210"
                type="tel"
              />
              <Field
                label="Email"
                value={contact.email ?? ''}
                onChange={(v) => update(i, { email: v })}
                onBlur={() => persist(contacts)}
                placeholder="rajesh@example.in"
                type="email"
              />
            </div>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => removeContact(i)}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addContact}
        className="gap-1.5"
      >
        <Plus className="h-3 w-3" />
        Add contact
      </Button>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  type = 'text',
  required = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur: () => void
  placeholder?: string
  type?: string
  required?: boolean
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        type={type}
        required={required}
        className="h-8 text-xs"
      />
    </div>
  )
}

function SaveIndicator({ status }: { status: Status }) {
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

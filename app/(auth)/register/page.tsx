'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { HardHat, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { registerAction } from '@/actions/auth'

export default function RegisterPage() {
  const [state, formAction] = useFormState(registerAction, null)

  return (
    <Card>
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <HardHat className="h-5 w-5" />
        </div>
        <div>
          <CardTitle>Create your workspace</CardTitle>
          <CardDescription>2 minutes. Your first RA bill in 10.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <Field
            id="firmName"
            label="Firm name"
            placeholder="Patel & Co Constructions"
            autoComplete="organization"
          />
          <Field id="ownerName" label="Your name" placeholder="Anand Patel" autoComplete="name" />
          <Field
            id="email"
            label="Work email"
            type="email"
            placeholder="you@firm.in"
            autoComplete="email"
          />
          <Field
            id="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            hint="At least 8 characters."
          />

          <OptionalDetails />

          {state?.error && (
            <p
              role="alert"
              className="flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
              {state.error}
            </p>
          )}

          <SubmitButton label="Create workspace" pendingLabel="Creating…" />
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

function Field({
  id,
  label,
  type = 'text',
  autoComplete,
  placeholder,
  minLength,
  hint,
  required = true,
  maxLength,
}: {
  id: string
  label: string
  type?: string
  autoComplete?: string
  placeholder?: string
  minLength?: number
  hint?: string
  required?: boolean
  maxLength?: number
}) {
  const { pending } = useFormStatus()
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        disabled={pending}
      />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

function OptionalDetails() {
  return (
    <details className="rounded-md border border-dashed border-border px-3 py-2 text-xs">
      <summary className="cursor-pointer select-none font-medium text-muted-foreground">
        Optional: GST + PAN (add now or in Settings)
      </summary>
      <div className="mt-3 space-y-3">
        <Field
          id="gstNumber"
          label="GST number"
          placeholder="29ABCDE1234F1Z5"
          required={false}
          maxLength={15}
        />
        <Field
          id="panNumber"
          label="PAN number"
          placeholder="ABCDE1234F"
          required={false}
          maxLength={10}
        />
      </div>
    </details>
  )
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  )
}

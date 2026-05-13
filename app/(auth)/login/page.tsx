'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { HardHat, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { loginAction } from '@/actions/auth'

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, null)

  return (
    <Card>
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <HardHat className="h-5 w-5" />
        </div>
        <div>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in to your CivilIQ workspace</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <Field id="email" label="Email" type="email" autoComplete="email" placeholder="you@firm.in" />
          <Field id="password" label="Password" type="password" autoComplete="current-password" />

          {state?.error && (
            <p
              role="alert"
              className="flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
              {state.error}
            </p>
          )}

          <SubmitButton label="Sign in" pendingLabel="Signing in…" />
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          New firm?{' '}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create your workspace
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
}: {
  id: string
  label: string
  type?: string
  autoComplete?: string
  placeholder?: string
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
        required
        disabled={pending}
      />
    </div>
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

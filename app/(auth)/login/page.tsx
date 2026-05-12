import Link from 'next/link'
import { HardHat } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
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
        {/* Form action is wired to a Server Action in Phase 1. */}
        <form className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@firm.in"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled>
            Sign in (wired in Phase 1)
          </Button>
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

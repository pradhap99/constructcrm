import { CheckCircle2 } from 'lucide-react'
import { auth } from '@/lib/auth'

export default async function TodayPage() {
  const session = await auth()
  const firstName = (session?.user?.name ?? 'there').trim().split(/\s+/)[0]

  // Phase 6 turns this into the real command-center (hero stat + three sections).
  // For Phase 1 the gate only requires the shell to render after login.
  return (
    <div className="p-6 md:p-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Welcome, {firstName}.</h1>
        <p className="text-sm text-muted-foreground">
          Your CivilIQ workspace is ready. The command-center lands in Phase 6.
        </p>
      </header>

      <section className="mx-auto flex max-w-sm flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-muted-foreground/40" />
        <h2 className="text-base font-medium">All clear — good day to plan ahead.</h2>
        <p className="text-sm text-muted-foreground">
          Overdue bills, closing tenders, and expiring projects will appear here once the
          relevant phases ship.
        </p>
      </section>
    </div>
  )
}

import { CheckCircle2 } from 'lucide-react'

export default function TodayPage() {
  // Phase 6 turns this into the real command-center (hero stat + three sections).
  // For Phase 0 the gate only requires the shell to render after login.
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <CheckCircle2 className="h-10 w-10 text-muted-foreground/40" />
        <h1 className="text-lg font-semibold">All clear — good day to plan ahead.</h1>
        <p className="text-sm text-muted-foreground">
          The command center will land in Phase 6 with overdue bills, closing tenders, and
          expiring projects.
        </p>
      </div>
    </main>
  )
}

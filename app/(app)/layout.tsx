import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

/**
 * App-shell layout. The session check runs server-side on every request.
 * In Phase 0 there is no signed-in session yet, so any visit redirects to
 * /login — exactly matching the Phase 0 gate. Phase 1 lights up the sidebar
 * shell from §8 and the real session flow.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return <div className="flex min-h-screen flex-col">{children}</div>
}

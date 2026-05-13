import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Sidebar } from '@/components/layout/sidebar'

/**
 * App-shell layout. Auth-gate runs server-side on every request; the
 * sidebar reads `session.user` (already populated with tenantId/role via
 * the JWT callback) and surfaces the signed-in identity.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="min-h-screen md:flex">
      <Sidebar
        user={{
          name: session.user.name ?? 'User',
          email: session.user.email ?? '',
          role: session.user.role,
        }}
      />
      <main className="flex-1 md:pl-0">{children}</main>
    </div>
  )
}

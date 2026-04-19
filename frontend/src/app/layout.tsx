import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { AppShell } from '@/components/layout/AppShell'

export const metadata: Metadata = {
  title: 'ConstructCRM - Civil Construction Intelligence',
  description: 'SaaS Platform for Civil Construction Management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}

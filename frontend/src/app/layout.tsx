import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export const metadata: Metadata = {
  title: 'ConstructCRM - Civil Construction Intelligence',
  description: 'SaaS Platform for Civil Construction Management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <Header />
              <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}

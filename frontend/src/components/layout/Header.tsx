'use client'

import { usePathname } from 'next/navigation'
import { Sun, Moon, Bell, Search, User } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

const breadcrumbMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/ai-reader': 'AI Draft Reader',
  '/projects': 'Projects',
  '/leads': 'Leads',
  '/indents': 'Indents / Purchase Requests',
  '/rfq': 'RFQ Management',
  '/vendors': 'Vendors',
  '/purchase-orders': 'Purchase Orders',
  '/grn': 'Goods Receipt Notes',
  '/invoices': 'Invoices',
  '/dpr': 'Daily Progress Reports',
  '/boq': 'Bill of Quantities',
  '/submittals': 'Submittals',
  '/change-orders': 'Change Orders',
  '/billing': 'Billing',
  '/analytics': 'Analytics',
}

export function Header() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  const segments = pathname.split('/').filter(Boolean)
  const baseRoute = '/' + segments[0]
  const title = breadcrumbMap[baseRoute] ?? 'ConstructCRM'

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b bg-background">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <p className="text-xs text-muted-foreground">
          Home {segments.map((s, i) => (
            <span key={i}> › <span className="capitalize">{s.replace(/-/g, ' ')}</span></span>
          ))}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search..."
            className="pl-9 pr-4 py-1.5 text-sm border rounded-lg bg-muted focus:outline-none focus:ring-2 focus:ring-ring w-48"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
        <Button variant="ghost" size="icon">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 ml-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden md:block text-sm">
            <p className="font-medium leading-none">Admin User</p>
            <p className="text-xs text-muted-foreground">admin@constructcrm.in</p>
          </div>
        </div>
      </div>
    </header>
  )
}

import {
  LayoutDashboard, Brain, Building2, Target, ClipboardList,
  FileSearch, Users, ShoppingCart, Package, Receipt,
  CalendarDays, BarChart3, FileCheck, GitBranch, Wallet,
  TrendingUp, Layers,
} from 'lucide-react'

export type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  badge?: string
  badgeClass?: string
  keywords?: string[]
}

export type NavGroup = { label: string; items: NavItem[] }

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, keywords: ['home', 'overview', 'kpi'] },
      {
        href: '/ai-reader', label: 'AI Draft Reader', icon: Brain,
        badge: '★ AI', badgeClass: 'bg-amber-100 text-amber-700',
        keywords: ['ocr', 'parse', 'extract', 'quote', 'devis'],
      },
      { href: '/analytics', label: 'Analytics', icon: TrendingUp, keywords: ['reports', 'charts', 'insights'] },
    ],
  },
  {
    label: 'Sales',
    items: [
      { href: '/projects', label: 'Projects', icon: Building2, keywords: ['site', 'job'] },
      { href: '/leads', label: 'Leads', icon: Target, keywords: ['pipeline', 'crm', 'prospects'] },
    ],
  },
  {
    label: 'Procurement',
    items: [
      { href: '/indents', label: 'Indents / PR', icon: ClipboardList, keywords: ['purchase request', 'requisition'] },
      { href: '/rfq', label: 'RFQ', icon: FileSearch, keywords: ['quotation', 'request for quote', 'compare'] },
      { href: '/vendors', label: 'Vendors', icon: Users, keywords: ['suppliers'] },
      { href: '/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart, keywords: ['po'] },
      { href: '/grn', label: 'GRN', icon: Package, keywords: ['goods received', 'receipt', '3-way match'] },
    ],
  },
  {
    label: 'Site & Quality',
    items: [
      { href: '/dpr', label: 'DPR', icon: CalendarDays, keywords: ['daily progress', 'site report'] },
      { href: '/boq', label: 'BOQ', icon: BarChart3, keywords: ['bill of quantities'] },
      { href: '/materials', label: 'Materials', icon: Layers, keywords: ['inventory', 'stock'] },
      { href: '/submittals', label: 'Submittals', icon: FileCheck, keywords: ['approval', 'shop drawing'] },
      { href: '/change-orders', label: 'Change Orders', icon: GitBranch, keywords: ['variation', 'co'] },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/invoices', label: 'Invoices', icon: Receipt, keywords: ['bills', 'payable'] },
      { href: '/billing', label: 'Billing', icon: Wallet, keywords: ['client billing', 'ra bill', 'receivable'] },
    ],
  },
]

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap(g => g.items)

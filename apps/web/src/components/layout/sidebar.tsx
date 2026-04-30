'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { NotificationBell } from '@/components/notifications-panel';
import {
  LayoutDashboard, FolderKanban, FileText, Package,
  Receipt, Users, Settings, LogOut, Building2,
  ChevronRight, Landmark, BarChart3, Briefcase,
} from 'lucide-react';

const NAV_MAIN = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/projects',   label: 'Projects',   icon: FolderKanban },
  { href: '/tenders',    label: 'Tenders',    icon: Briefcase },
  { href: '/documents',  label: 'Documents',  icon: FileText },
  { href: '/materials',  label: 'Materials',  icon: Package },
  { href: '/bills',      label: 'RA Bills',   icon: Receipt },
];

const NAV_SECONDARY = [
  { href: '/reports',    label: 'Reports',    icon: BarChart3 },
  { href: '/team',       label: 'Team',       icon: Users },
  { href: '/settings',   label: 'Settings',   icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const NavLink = ({ href, label, icon: Icon }: { href: string; label: string; icon: any }) => {
    const active = pathname === href || pathname.startsWith(href + '/');
    return (
      <Link
        href={href}
        onClick={onClose}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
          active
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {label}
        {active && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
      </Link>
    );
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 flex flex-col z-50">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800 shrink-0">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3 shrink-0">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-white font-bold text-sm leading-tight">CivilIQ</div>
          <div className="text-slate-400 text-xs">Construction AI</div>
        </div>
      </div>

      {/* Firm name + notification bell */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 shrink-0 bg-slate-900/80">
        <div className="flex items-center gap-2 min-w-0">
          <Landmark className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="text-slate-400 text-xs truncate font-medium">
            {(user as any)?.tenantName || (user as any)?.firmName || 'My Firm'}
          </span>
        </div>
        <NotificationBell />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-0.5">
          {NAV_MAIN.map(item => <NavLink key={item.href} {...item} />)}
        </div>

        <div className="my-3 border-t border-slate-800" />

        <div className="space-y-0.5">
          {NAV_SECONDARY.map(item => <NavLink key={item.href} {...item} />)}
        </div>
      </nav>

      {/* Cmd+K hint */}
      <div className="px-4 py-2 border-t border-slate-800 shrink-0">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-400 text-[10px] font-mono">⌘K</kbd>
          <span>Quick search</span>
        </div>
      </div>

      {/* User */}
      <div className="p-3 border-t border-slate-800 shrink-0">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg mb-1">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-medium truncate">{user?.name || 'User'}</div>
            <div className="text-slate-500 text-xs uppercase tracking-wide truncate">{user?.role || ''}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

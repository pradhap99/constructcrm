'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { useAuthStore } from '@/store/auth';
import { Menu } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, hydrate } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isAuthenticated) {
      const token = localStorage.getItem('civiliq_token');
      if (!token) router.push('/login');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed on desktop, slide-in on mobile */}
      <div className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <main className="flex-1 lg:ml-64 overflow-y-auto min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          <span className="text-sm font-semibold text-slate-900">CivilIQ</span>
        </div>

        {children}
      </main>
    </div>
  );
}

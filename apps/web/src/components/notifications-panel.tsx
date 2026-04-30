'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, X, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/utils';

const SEVERITY_CFG: Record<string, { icon: any; bg: string; border: string; iconColor: string }> = {
  CRITICAL: { icon: AlertTriangle, bg: 'bg-red-50',    border: 'border-red-100',    iconColor: 'text-red-500' },
  WARNING:  { icon: AlertTriangle, bg: 'bg-amber-50',  border: 'border-amber-100',  iconColor: 'text-amber-500' },
  INFO:     { icon: Info,          bg: 'bg-blue-50',   border: 'border-blue-100',   iconColor: 'text-blue-500' },
  SUCCESS:  { icon: CheckCircle2,  bg: 'bg-green-50',  border: 'border-green-100',  iconColor: 'text-green-500' },
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: api.getNotifications,
    refetchInterval: 30_000,
  });

  const markSeen = useMutation({
    mutationFn: api.markNotificationSeen,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = (notifications as any[]).filter(
    (n: any) => !n.seenAt && ['CRITICAL', 'WARNING'].includes(n.severity)
  );

  const sorted = [...(notifications as any[])].sort((a: any, b: any) => {
    const order: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2, SUCCESS: 3 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });

  const markAll = () => {
    (notifications as any[])
      .filter((n: any) => !n.seenAt)
      .forEach((n: any) => markSeen.mutate(n.id));
  };

  return (
    <>
      {/* Bell button */}
      <button
        onClick={() => setOpen(true)}
        className="relative p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
      >
        <Bell className="w-4 h-4 text-slate-400" />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in panel */}
      <div className={`fixed right-0 top-0 h-full w-80 bg-white border-l border-slate-200 z-50 shadow-2xl flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
            {unread.length > 0 && (
              <p className="text-xs text-slate-400 mt-0.5">{unread.length} unread</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unread.length > 0 && (
              <button
                onClick={markAll}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-6">
              <Bell className="w-10 h-10 text-slate-200 mb-3" />
              <p className="text-sm text-slate-500 font-medium">All clear</p>
              <p className="text-xs text-slate-400 mt-1">No alerts right now</p>
            </div>
          ) : (
            sorted.map((n: any) => {
              const cfg = SEVERITY_CFG[n.severity] || SEVERITY_CFG.INFO;
              const Icon = cfg.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => { if (!n.seenAt) markSeen.mutate(n.id); }}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors ${!n.seenAt ? cfg.bg : ''}`}
                >
                  <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.iconColor}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${!n.seenAt ? 'text-slate-900' : 'text-slate-600'} leading-snug`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                    )}
                    {n.projectName && (
                      <p className="text-xs text-slate-400 mt-1">{n.projectName}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.seenAt && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

'use client';
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

type AddToast = (t: Omit<ToastItem, 'id'>) => void;

const ToastContext = createContext<AddToast>(() => {});

// Module-level ref so toast.success() works outside React trees
let _addToast: AddToast = () => {};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const add = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4000);
  }, []);

  useEffect(() => {
    _addToast = add;
  }, [add]);

  const remove = (id: string) => setToasts(p => p.filter(x => x.id !== id));

  const style: Record<ToastType, string> = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error:   'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info:    'bg-blue-50 border-blue-200 text-blue-800',
  };

  const Icon = ({ type }: { type: ToastType }) => {
    if (type === 'success') return <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />;
    if (type === 'error')   return <XCircle className="w-4 h-4 shrink-0 mt-0.5" />;
    if (type === 'warning') return <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />;
    return <Info className="w-4 h-4 shrink-0 mt-0.5" />;
  };

  return (
    <ToastContext.Provider value={add}>
      {children}
      <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 w-80 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border text-sm ${style[t.type]}`}
          >
            <Icon type={t.type} />
            <span className="flex-1 font-medium leading-snug">{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              className="opacity-60 hover:opacity-100 transition-opacity shrink-0 mt-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/** Use this in mutation callbacks — works outside of React component tree */
export const toast = {
  success: (message: string) => _addToast({ type: 'success', message }),
  error:   (message: string) => _addToast({ type: 'error',   message }),
  info:    (message: string) => _addToast({ type: 'info',    message }),
  warning: (message: string) => _addToast({ type: 'warning', message }),
};

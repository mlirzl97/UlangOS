import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, description?: string) => void;
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
  warning: (message: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success', description?: string) => {
      const id = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      setToasts((prev) => [...prev.slice(-3), { id, type, message, description }]);
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const success = useCallback((msg: string, desc?: string) => showToast(msg, 'success', desc), [showToast]);
  const error = useCallback((msg: string, desc?: string) => showToast(msg, 'error', desc), [showToast]);
  const info = useCallback((msg: string, desc?: string) => showToast(msg, 'info', desc), [showToast]);
  const warning = useCallback((msg: string, desc?: string) => showToast(msg, 'warning', desc), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          const typeStyles = {
            success: 'bg-[#194432] text-white border-[#133628]',
            error: 'bg-[#7f1d1d] text-white border-[#991b1b]',
            warning: 'bg-[#78350f] text-white border-[#92400e]',
            info: 'bg-[#0f172a] text-white border-[#1e293b]',
          };

          const icons = {
            success: <CheckCircle2 className="w-4 h-4 text-[#4ade80] shrink-0 mt-0.5" />,
            error: <AlertCircle className="w-4 h-4 text-[#f87171] shrink-0 mt-0.5" />,
            warning: <AlertCircle className="w-4 h-4 text-[#fbbf24] shrink-0 mt-0.5" />,
            info: <Info className="w-4 h-4 text-[#38bdf8] shrink-0 mt-0.5" />,
          };

          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto p-3 sm:p-3.5 rounded-[8px] border shadow-lg flex items-start gap-2.5 animate-in slide-in-from-bottom-2 fade-in duration-200 ${typeStyles[t.type]}`}
            >
              {icons[t.type]}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold tracking-tight">{t.message}</div>
                {t.description && <div className="text-[11px] opacity-80 mt-0.5 leading-normal">{t.description}</div>}
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="opacity-70 hover:opacity-100 p-0.5 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};

import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: 'border-[var(--color-secondary-500)] bg-[var(--color-secondary-50)] text-[var(--color-secondary-700)] dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
  error: 'border-[var(--color-danger-500)] bg-[var(--color-danger-50)] text-[var(--color-danger-700)] dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700',
  warning: 'border-[var(--color-warning-500)] bg-[var(--color-warning-50)] text-[var(--color-warning-600)] dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
  info: 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)] dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error', 6000),
    warning: (msg) => addToast(msg, 'warning'),
    info: (msg) => addToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg animate-slide-up ${styles[t.type]}`}
            >
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium flex-1">{t.message}</p>
              <button
                onClick={() => removeToast(t.id)}
                className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

export interface ToastOptions {
  type?: ToastType;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (title: string, options?: ToastOptions) => string;
  dismissToast: (id: string) => void;
  toast: {
    success: (title: string, description?: string, duration?: number) => string;
    error: (title: string, description?: string, duration?: number) => string;
    info: (title: string, description?: string, duration?: number) => string;
    warning: (title: string, description?: string, duration?: number) => string;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (title: string, options?: ToastOptions): string => {
      const id = Math.random().toString(36).substring(2, 9);
      const type = options?.type || 'success';
      const duration = options?.duration ?? DEFAULT_DURATION;

      const newToast: ToastItem = {
        id,
        title,
        description: options?.description,
        type,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast]
  );

  const toastHelpers = {
    success: (title: string, description?: string, duration?: number) =>
      showToast(title, { type: 'success', description, duration }),
    error: (title: string, description?: string, duration?: number) =>
      showToast(title, { type: 'error', description, duration }),
    info: (title: string, description?: string, duration?: number) =>
      showToast(title, { type: 'info', description, duration }),
    warning: (title: string, description?: string, duration?: number) =>
      showToast(title, { type: 'warning', description, duration }),
  };

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, toast: toastHelpers }}>
      {children}
      {/* Toast viewport container */}
      <div
        aria-live="assertive"
        className="fixed top-5 right-5 z-[100] flex flex-col gap-2.5 pointer-events-none max-sm:left-5 max-sm:right-5 items-end max-sm:items-stretch"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((item) => (
            <ToastCard key={item.id} toast={item} onDismiss={() => dismissToast(item.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-moss" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-ember" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-gold-stamp" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-ink/70" />;
    }
  };

  const getAccentBg = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-moss/10 border-moss/20';
      case 'error':
        return 'bg-ember/10 border-ember/20';
      case 'warning':
        return 'bg-gold-stamp/10 border-gold-stamp/20';
      case 'info':
      default:
        return 'bg-ink/10 border-ink/20';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -15, scale: 0.94, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
      className="pointer-events-auto bg-paper/95 backdrop-blur-md border border-ink/10 shadow-lg shadow-ink/5 rounded-2xl p-4 flex items-start gap-3.5 w-full max-w-sm sm:w-96 relative overflow-hidden"
      role="alert"
    >
      {/* Icon badge */}
      <div
        className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border',
          getAccentBg()
        )}
      >
        {getIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 pt-0.5 min-w-0 pr-1">
        <h4 className="font-ui text-sm font-semibold text-ink leading-tight">
          {toast.title}
        </h4>
        {toast.description && (
          <p className="font-ui text-xs text-faded-ink mt-1 leading-relaxed">
            {toast.description}
          </p>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={onDismiss}
        className="p-1 text-faded-ink hover:text-ink transition-colors rounded-lg hover:bg-ink/5 focus:outline-none flex-shrink-0 -mt-1 -mr-1"
        aria-label="Close notification"
        type="button"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

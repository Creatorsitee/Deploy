'use client';

import React, { createContext, useContext, useState, useCallback, useId } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Check,
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ToastContextValue {
  toast: {
    success: (message: string, title?: string, duration?: number) => void;
    error: (message: string, title?: string, duration?: number) => void;
    warning: (message: string, title?: string, duration?: number) => void;
    info: (message: string, title?: string, duration?: number) => void;
    custom: (item: Omit<ToastItem, 'id'>) => void;
    dismiss: (id: string) => void;
  };
  confirmModal: (options: ConfirmDialogOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Graceful fallback if invoked outside Provider
    return {
      toast: {
        success: (msg: string) => console.log('[Success]', msg),
        error: (msg: string) => console.error('[Error]', msg),
        warning: (msg: string) => console.warn('[Warning]', msg),
        info: (msg: string) => console.info('[Info]', msg),
        custom: () => {},
        dismiss: () => {},
      },
      confirmModal: (opts: ConfirmDialogOptions) => {
        opts.onConfirm();
      },
    };
  }
  return context;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogOptions | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, title?: string, duration = 4500) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss]
  );

  const toastMethods = {
    success: (message: string, title?: string, duration?: number) =>
      addToast('success', message, title, duration),
    error: (message: string, title?: string, duration?: number) =>
      addToast('error', message, title, duration),
    warning: (message: string, title?: string, duration?: number) =>
      addToast('warning', message, title, duration),
    info: (message: string, title?: string, duration?: number) =>
      addToast('info', message, title, duration),
    custom: (item: Omit<ToastItem, 'id'>) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      setToasts((prev) => [...prev, { ...item, id }]);
      if (item.duration && item.duration > 0) {
        setTimeout(() => dismiss(id), item.duration);
      }
    },
    dismiss,
  };

  const openConfirmModal = useCallback((options: ConfirmDialogOptions) => {
    setConfirmDialog(options);
  }, []);

  const handleConfirmAction = async () => {
    if (!confirmDialog) return;
    try {
      setConfirmLoading(true);
      await confirmDialog.onConfirm();
      setConfirmDialog(null);
    } catch (err: any) {
      toastMethods.error(err?.message || 'Operation failed');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleCancelAction = () => {
    if (confirmDialog?.onCancel) {
      confirmDialog.onCancel();
    }
    setConfirmDialog(null);
  };

  return (
    <ToastContext.Provider value={{ toast: toastMethods, confirmModal: openConfirmModal }}>
      {children}

      {/* Floating CSS Toasts Container (Top-Right on desktop, Top-Center on mobile) */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[9999] pointer-events-none flex flex-col gap-2.5 max-h-[90vh] overflow-y-auto no-scrollbar"
      >
        {toasts.map((t) => {
          let bg = 'bg-white border-neutral-200 text-neutral-900 shadow-xl';
          let icon = <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />;

          if (t.type === 'success') {
            bg = 'bg-emerald-950/95 text-white border-emerald-800 shadow-emerald-950/30';
            icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />;
          } else if (t.type === 'error') {
            bg = 'bg-rose-950/95 text-white border-rose-800 shadow-rose-950/30';
            icon = <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />;
          } else if (t.type === 'warning') {
            bg = 'bg-amber-950/95 text-white border-amber-800 shadow-amber-950/30';
            icon = <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />;
          } else {
            bg = 'bg-neutral-900/95 text-white border-neutral-800 shadow-black/40';
            icon = <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />;
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto border rounded-xl p-3.5 px-4 backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 flex items-start justify-between gap-3 text-xs shadow-lg animate-in slide-in-from-top-3 ${bg}`}
            >
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                {icon}
                <div className="space-y-0.5 min-w-0 flex-1">
                  {t.title && <div className="font-bold tracking-tight text-xs">{t.title}</div>}
                  <div className="leading-relaxed opacity-90 break-words font-medium">{t.message}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="opacity-70 hover:opacity-100 p-1 -mr-1 rounded text-xs font-bold transition hover:bg-white/10 shrink-0"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Styled CSS Confirmation Dialog Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  confirmDialog.danger ? 'bg-rose-100 text-rose-600' : 'bg-neutral-100 text-neutral-800'
                }`}
              >
                {confirmDialog.danger ? <AlertCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="font-bold text-sm text-neutral-950">{confirmDialog.title}</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">{confirmDialog.message}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={handleCancelAction}
                disabled={confirmLoading}
                className="px-4 py-2 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition active:scale-95"
              >
                {confirmDialog.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={confirmLoading}
                className={`px-4 py-2 rounded-lg text-xs font-semibold text-white transition active:scale-95 disabled:opacity-50 ${
                  confirmDialog.danger
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-neutral-950 hover:bg-neutral-800'
                }`}
              >
                {confirmLoading ? 'Processing...' : confirmDialog.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

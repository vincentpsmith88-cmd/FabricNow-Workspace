import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, TriangleAlert, X } from 'lucide-react';

const ToastCtx = createContext({ push: () => {}, success: () => {}, error: () => {}, info: () => {}, confirm: async () => false });
export const useToast = () => useContext(ToastCtx);

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info, warning: TriangleAlert };

export function ToastProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const nextId = useRef(1);
  const resolver = useRef(null);

  const close = useCallback((result = true) => {
    const resolve = resolver.current;
    resolver.current = null;
    setDialog(null);
    resolve?.(result);
  }, []);

  const show = useCallback((message, kind = 'info', options = {}) => {
    setDialog({ id: nextId.current++, mode: 'message', message: String(message || ''), kind, ...options });
  }, []);

  const confirm = useCallback((options = {}) => new Promise(resolve => {
    resolver.current = resolve;
    setDialog({
      id: nextId.current++, mode: 'confirm', kind: options.kind || 'warning',
      title: options.title || 'Are you sure?',
      message: options.message || 'This action cannot be undone.',
      confirmLabel: options.confirmLabel || 'Continue',
      cancelLabel: options.cancelLabel || 'Cancel',
      busy: false,
      ...options,
    });
  }), []);

  const api = {
    push: show,
    success: (m, options) => show(m, 'success', options),
    error: (m, options) => show(m, 'error', options),
    info: (m, options) => show(m, 'info', options),
    warning: (m, options) => show(m, 'warning', options),
    confirm,
  };

  const Icon = dialog ? (ICONS[dialog.kind] || Info) : Info;
  const isConfirm = dialog?.mode === 'confirm';

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {dialog && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !isConfirm) close(true); }}>
          <section className={`dialog dialog-${dialog.kind}`} role={isConfirm ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby="workspace-dialog-title" onMouseDown={e => e.stopPropagation()}>
            <button className="dialog-close" onClick={() => close(isConfirm ? false : true)} aria-label="Close"><X size={18}/></button>
            <div className="dialog-icon"><Icon size={25}/></div>
            <h2 id="workspace-dialog-title">{dialog.title || (dialog.kind === 'success' ? 'Completed' : dialog.kind === 'error' ? 'Something went wrong' : 'Please review')}</h2>
            <p>{dialog.message}</p>
            <div className="dialog-actions">
              {isConfirm && <button className="btn btn-ghost" onClick={() => close(false)}>{dialog.cancelLabel}</button>}
              <button autoFocus className={`btn ${dialog.kind === 'error' || dialog.kind === 'warning' ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(true)}>
                {isConfirm ? dialog.confirmLabel : 'Continue'}
              </button>
            </div>
          </section>
        </div>
      )}
    </ToastCtx.Provider>
  );
}

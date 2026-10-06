import { createContext, useCallback, useContext, useState } from 'react';
import classNames from 'classnames';
import { CircleCheck, CircleAlert } from 'lucide-react';

const ToastContext = createContext(() => {});

// Short confirmations ("Saved") that appear briefly and go away on their own.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, tone = 'success') => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6">
        {toasts.map(({ id, message, tone }) => {
          const Icon = tone === 'error' ? CircleAlert : CircleCheck;
          return (
            <div
              key={id}
              className={classNames(
                'pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold shadow-soft',
                tone === 'error' ? 'bg-danger text-white dark:text-background' : 'bg-foreground text-background',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

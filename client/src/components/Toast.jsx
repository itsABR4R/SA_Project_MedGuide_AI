import { useEffect } from 'react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(onClose, 3600);
    return () => window.clearTimeout(timer);
  }, [toast, onClose]);

  return (
    <div
      className={`toast${toast ? ' show' : ''}${toast?.error ? ' error' : ''}`}
      id="toast"
      role="status"
      aria-live="polite"
    >
      {toast?.message || ''}
    </div>
  );
}

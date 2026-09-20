'use client';

import { useEffect, useState } from 'react';

/**
 * §10 — a toast states what happened and disappears. No success celebration, no icon
 * beyond a plain tick.
 */

const EVENT = 'workflows:toast';

export function toast(message: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: message }));
}

export function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onToast = (e: Event) => {
      setMessage((e as CustomEvent<string>).detail);
      clearTimeout(timer);
      timer = setTimeout(() => setMessage(null), 2400);
    };
    window.addEventListener(EVENT, onToast);
    return () => {
      window.removeEventListener(EVENT, onToast);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
    >
      {message && (
        <div className="animate-fade-in rounded-card border border-edge-strong bg-surface-2 px-4 py-2.5 text-small text-primary shadow-float">
          {message}
        </div>
      )}
    </div>
  );
}

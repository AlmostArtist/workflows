'use client';

import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const KEY = 'workflows-theme';

/**
 * Runs before first paint so the page never flashes the wrong theme. Inlined into
 * <head> by the root layout; kept as a string because it must execute synchronously,
 * ahead of React.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var t=localStorage.getItem('${KEY}');
// Light is the default, unconditionally. Only a visitor who has chosen dark before
// gets dark; the OS preference does not override the product's own default.
if(t!=='light'&&t!=='dark'){t='light';}
document.documentElement.setAttribute('data-theme',t);
}catch(e){document.documentElement.setAttribute('data-theme','light');}
// Transitions are enabled only after the first paint, so the initial render is instant.
requestAnimationFrame(function(){document.documentElement.classList.add('theme-ready');});
})();`;

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    setThemeState(current === 'dark' ? 'dark' : 'light');
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    document.documentElement.setAttribute('data-theme', t);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      // Private mode — the theme still applies for this session.
    }
  };

  return [theme, setTheme];
}

/** Two-state switch. Labelled, keyboard-operable, and honest about what it does. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={`relative grid h-9 w-9 place-content-center rounded-card border border-edge-subtle bg-surface text-secondary transition-colors duration-hover hover:border-edge-strong hover:text-primary ${className}`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {theme === 'dark' ? (
          // Showing a sun means "press for light".
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
          </>
        ) : (
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
        )}
      </svg>
    </button>
  );
}

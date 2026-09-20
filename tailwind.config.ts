import type { Config } from 'tailwindcss';

/**
 * Every colour, radius, type step and spacing value in §4 of the build brief lives here.
 * Components reference these tokens by name — no hex literals in component files.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        surface: 'var(--bg-surface)',
        'surface-2': 'var(--bg-surface-2)',
        inset: 'var(--bg-inset)',
        'edge-subtle': 'var(--border-subtle)',
        'edge-strong': 'var(--border-strong)',
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        tertiary: 'var(--text-tertiary)',
        meta: 'var(--text-meta)',
        ember: 'var(--ember)',
        'ember-dim': 'var(--ember-dim)',
        'ember-wash': 'var(--ember-wash)',
        'ember-contrast': 'var(--ember-contrast)',
        'signal-video': 'var(--signal-video)',
        'signal-image': 'var(--signal-image)',
        'signal-error': 'var(--signal-error)',
        'signal-ok': 'var(--signal-ok)',
      },
      borderRadius: {
        // The redesign adds two larger steps for bento tiles and the hero panel; the
        // original card/chip/token scale is unchanged beneath them.
        panel: '24px',
        bento: '16px',
        card: '10px',
        chip: '6px',
        token: '4px',
      },
      fontFamily: {
        sans: ['var(--font-display)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        // [size, { lineHeight, letterSpacing, fontWeight }] — the §4.4 scale, verbatim.
        'display-xl': ['56px', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-l': ['36px', { lineHeight: '1.1', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-m': ['22px', { lineHeight: '1.25', fontWeight: '600' }],
        'heading-s': ['17px', { lineHeight: '1.3', fontWeight: '600' }],
        body: ['15px', { lineHeight: '1.5', fontWeight: '400' }],
        small: ['13px', { lineHeight: '1.4', fontWeight: '450' }],
        micro: ['12px', { lineHeight: '1.4', fontWeight: '450' }],
      },
      maxWidth: {
        prose: '68ch',
        shell: '1440px',
        hero: '780px',
      },
      boxShadow: {
        // §4.5 — shadows are reserved for floating and hover-lifted elements.
        float: 'var(--shadow-float)',
        lift: 'var(--shadow-lift)',
      },
      spacing: {
        rail: '240px',
        section: '64px',
      },
      transitionDuration: {
        hover: '120ms',
        fade: '150ms',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'sheet-up': 'sheet-up 180ms cubic-bezier(0.32,0.72,0,1)',
        drift: 'drift 14s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;

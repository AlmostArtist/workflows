/**
 * Client-safe category tokens (§4.3). Names and counts come from the server via props;
 * this module holds only presentation tokens, so a client component can colour a badge
 * without a round trip.
 */

/**
 * Accents are sampled from each collection's own Lottie animation by
 * `tools/lottie_colors.py`, so a card's colour matches the icon sitting on it.
 * The icon set shares one house palette, so each collection takes the colour from
 * its own artwork that keeps the fourteen furthest apart in hue — colour coding in
 * the browse grid still works. Re-run `npm run colors` after changing an icon.
 */
export const CATEGORY_COLORS: Record<string, string> = {
  A: '#F1770E',
  B: '#29AAD6',
  C: '#E88CB2',
  D: '#F55747',
  E: '#F54776',
  F: '#33CCCC',
  G: '#F87C7C',
  H: '#E29C92',
  I: '#AD86EE',
  J: '#7C99F8',
  K: '#F2B00D',
  L: '#F8D47C',
  M: '#C1F20D',
  N: '#B7DC60',
};

export const CATEGORY_NAMES: Record<string, string> = {
  A: 'Product catalogues',
  B: 'Editorial frames',
  C: 'Character sheets',
  D: 'Relight composites',
  E: 'Poster / social',
  F: 'Reshoot director',
  G: '30s from 3x10s',
  H: 'Brand campaign ads',
  I: 'Viral short-form',
  J: 'Omni image systems',
  K: 'Product image systems',
  L: 'Video director systems',
  M: 'Viral Omniflash systems',
  N: 'Image concept packs',
};

/** One-line promise per collection, for the tinted bento cards. */
export const CATEGORY_TAGLINES: Record<string, string> = {
  A: 'Six locked angles per product.',
  B: 'Cast-led cinematic frames.',
  C: 'Moodboard to turnaround sheet.',
  D: 'Cut out, drop in, relight.',
  E: 'One layout, three ratios.',
  F: 'Re-block any reference clip.',
  G: 'Three segments, one 30s cut.',
  H: 'Studio ads written to persona.',
  I: 'Short-form built on a hook.',
  J: 'Deep multi-stage image systems.',
  K: 'Production image programmes.',
  L: 'Dense video direction rigs.',
  M: 'Platform-native viral formats.',
  N: 'Hand-named concept packs.',
};

export const CATEGORY_CODES = Object.keys(CATEGORY_COLORS);

export function categoryColor(code: string): string {
  return CATEGORY_COLORS[code] ?? 'var(--text-secondary)';
}

export function categoryName(code: string): string {
  return CATEGORY_NAMES[code] ?? code;
}

export function categoryTagline(code: string): string {
  return CATEGORY_TAGLINES[code] ?? '';
}

/** Category colour at a given alpha — used for badge fills and card tints. */
export function categoryTint(code: string, alpha: number): string {
  const hex = categoryColor(code);
  if (!hex.startsWith('#')) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * The full set of CSS custom properties a tinted surface needs. Fill and border alpha,
 * plus how far the hue is darkened for text, all come from the active theme — so one
 * component definition reads correctly on graphite and on paper.
 */
export function tintVars(code: string): React.CSSProperties {
  const hex = categoryColor(code);
  return {
    // `color-mix` darkens the hue toward the page's own text colour in light mode and
    // leaves it untouched in dark mode, driven by --tint-text.
    ['--c' as string]: hex,
    ['--c-fill' as string]: `color-mix(in srgb, ${hex} calc(var(--tint-fill) * 100%), transparent)`,
    ['--c-border' as string]: `color-mix(in srgb, ${hex} calc(var(--tint-border) * 100%), transparent)`,
    ['--c-text' as string]: `color-mix(in srgb, ${hex} calc(var(--tint-text) * 100%), var(--text-primary))`,
  } as React.CSSProperties;
}

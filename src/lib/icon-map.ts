/**
 * The single place that maps a collection or a UI role to one of the Lottie animations in
 * `public/icons`. Components ask for a role, never a filename, so re-pointing an icon is a
 * one-line change here.
 */

/** Collection code -> animation. A–I have purpose-made art; J–N draw from the generic pool. */
export const CATEGORY_LOTTIE: Record<string, string> = {
  A: 'cat-a-product',
  B: 'cat-b-editorial',
  C: 'cat-c-character',
  D: 'cat-d-relight',
  E: 'cat-e-poster',
  F: 'cat-f-director',
  G: 'cat-g-30s',
  H: 'cat-h-campaign',
  I: 'cat-i-viral',
  J: 'cat-j-omni',
  K: 'cat-k-product-image',
  L: 'cat-l-video',
  M: 'cat-m-viral-omni',
  N: 'cat-n-concept',
};

/** Animated letter glyphs, used on category headers where the code is the subject. */
export const LETTER_LOTTIE: Record<string, string> = {
  A: 'letter-a',
  B: 'letter-b',
  C: 'letter-c',
  D: 'letter-d',
  E: 'letter-e',
  F: 'letter-f',
  G: 'letter-g',
  H: 'letter-h',
  I: 'letter-i',
};

export function categoryLottie(code: string): string {
  return CATEGORY_LOTTIE[code] ?? 'ui-aperture';
}

export function letterLottie(code: string): string | null {
  return LETTER_LOTTIE[code] ?? null;
}

/** Named roles for everything that is not a collection. */
export const UI_LOTTIE = {
  search: 'ui-aperture',
  shutter: 'ui-shutter',
  camera: 'ui-camera',
  video: 'ui-video',
  videoCamera: 'ui-video-camera',
  ai: 'ui-ai',
  assistant: 'ui-assistant',
  bot: 'ui-bot',
  android: 'ui-android',
} as const;

export type UiLottieRole = keyof typeof UI_LOTTIE;

export function uiLottie(role: UiLottieRole): string {
  return UI_LOTTIE[role];
}

/** Output type -> animation, for the workflow badges. */
export function outputLottie(out: string): string {
  return out.includes('video') ? UI_LOTTIE.video : UI_LOTTIE.camera;
}

/** The three how-it-works steps on the landing page. */
export const STEP_LOTTIE = ['ui-aperture', 'ui-assistant', 'ui-ai'] as const;

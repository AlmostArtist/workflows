/** Small formatting helpers. Voice rules from §10: factual, no decoration. */

export function num(n: number): string {
  return n.toLocaleString('en-US');
}

export function kb(n: number): string {
  if (n >= 1024) return `${(n / 1024).toFixed(1)} MB`;
  return `${n < 10 ? n.toFixed(1) : Math.round(n)} KB`;
}

export function outputLabel(out: string): string {
  return out === 'image+video' ? 'image + video' : out;
}

/** Trims a long model list to two names plus a count, per §6.1. */
export function modelSummary(models: string[], max = 2): { shown: string[]; more: number } {
  return { shown: models.slice(0, max), more: Math.max(0, models.length - max) };
}

export function plural(n: number, one: string, many = one + 's'): string {
  return n === 1 ? one : many;
}

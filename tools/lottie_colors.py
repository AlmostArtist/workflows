#!/usr/bin/env python3
"""Derive each collection's accent colour from its own Lottie animation.

The category palette originally came from the build brief and had nothing to do with
the artwork. This walks every animation, collects the colours it actually paints, and
picks the one a viewer would call "the colour of that icon" — then normalises it into a
band that works as a UI accent on both the graphite and the paper theme.

Usage: python3 tools/lottie_colors.py [--write]
"""
from __future__ import annotations

import argparse
import colorsys
import random
import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from categories import CATEGORIES  # noqa: E402

ICONS = Path(__file__).resolve().parents[1] / 'public' / 'icons'

# Icon file per collection, mirroring src/lib/icon-map.ts.
ICON_FOR = {
    'A': 'cat-a-product', 'B': 'cat-b-editorial', 'C': 'cat-c-character',
    'D': 'cat-d-relight', 'E': 'cat-e-poster', 'F': 'cat-f-director',
    'G': 'cat-g-30s', 'H': 'cat-h-campaign', 'I': 'cat-i-viral',
    'J': 'cat-j-omni', 'K': 'cat-k-product-image', 'L': 'cat-l-video',
    'M': 'cat-m-viral-omni', 'N': 'cat-n-concept',
}


def collect(node, out: list, depth: int = 0) -> list:
    """Every solid fill/stroke colour and every gradient stop in the animation."""
    if depth > 16:
        return out
    if isinstance(node, dict):
        c = node.get('c')
        if isinstance(c, dict) and isinstance(c.get('k'), list):
            k = c['k']
            if len(k) >= 3 and all(isinstance(x, (int, float)) for x in k[:3]):
                out.append(tuple(k[:3]))
        g = node.get('g')
        if isinstance(g, dict) and isinstance(g.get('k'), dict):
            stops = g['k'].get('k')
            if isinstance(stops, list) and stops and isinstance(stops[0], (int, float)):
                # Flat [offset, r,g,b, offset, r,g,b, ...]
                for i in range(0, len(stops) - 3, 4):
                    out.append(tuple(stops[i + 1:i + 4]))
        for v in node.values():
            collect(v, out, depth + 1)
    elif isinstance(node, list):
        for v in node:
            collect(v, out, depth + 1)
    return out


def score(rgb: tuple[float, float, float], count: int) -> float:
    """Favour saturated, mid-toned colours that appear often; reject neutrals."""
    r, g, b = rgb
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    if s < 0.28:            # greys, whites, blacks carry no identity
        return 0.0
    if l < 0.12 or l > 0.94:  # near-black / near-white
        return 0.0
    # A mid lightness reads best as an accent; frequency breaks ties.
    lightness_fit = 1.0 - abs(l - 0.55) * 1.3
    return max(0.0, lightness_fit) * (s ** 1.4) * (count ** 0.55)


def to_accent(rgb: tuple[float, float, float]) -> str:
    """Normalise into the band the UI palette uses, keeping the hue intact."""
    h, l, s = colorsys.rgb_to_hls(*rgb)
    # Yellows and greens read lighter at equal L, so nudge their target down a little.
    target_l = 0.62 if not (0.12 < h < 0.42) else 0.58
    l2 = min(0.74, max(0.50, (l + target_l) / 2))
    s2 = min(0.88, max(0.52, s))
    r, g, b = colorsys.hls_to_rgb(h, l2, s2)
    return '#%02X%02X%02X' % tuple(int(round(x * 255)) for x in (r, g, b))


def _srgb_to_lin(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def to_lab(hexv: str) -> tuple[float, float, float]:
    """sRGB hex -> CIELAB (D65). Used so separation is judged the way an eye judges it."""
    h = hexv.lstrip('#')
    r, g, b = (_srgb_to_lin(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4))
    x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    y = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 1.00000
    z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883

    def f(t: float) -> float:
        return t ** (1 / 3) if t > 0.008856 else (7.787 * t + 16 / 116)

    fx, fy, fz = f(x), f(y), f(z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def delta_e(a: str, b: str) -> float:
    la, aa, ba = to_lab(a)
    lb, ab, bb = to_lab(b)
    return ((la - lb) ** 2 + (aa - ab) ** 2 + (ba - bb) ** 2) ** 0.5


def variants(rgb: tuple[float, float, float]) -> list[str]:
    """
    The same source colour at a few lightness steps inside the UI-usable band.

    The animations share one house palette with no greens at all, so fourteen accents
    cannot be separated by hue alone. Keeping each collection's hue authentic and
    letting lightness carry part of the distinction is what makes a deep blue and a
    pale blue read as two different collections.
    """
    h, _l, s = colorsys.rgb_to_hls(*rgb)
    out = []
    for target_l in (0.50, 0.62, 0.73):
        s2 = min(0.9, max(0.5, s))
        r, g, b = colorsys.hls_to_rgb(h, target_l, s2)
        out.append('#%02X%02X%02X' % tuple(int(round(x * 255)) for x in (r, g, b)))
    return out


# Theme constants, mirroring src/app/globals.css. An accent is only usable if it clears
# WCAG AA as the subtitle colour on its own tinted card, in BOTH themes — otherwise the
# palette looks fine in isolation and fails the moment it is used.
DARK_SURFACE, DARK_TEXT, DARK_TINT_FILL, DARK_TINT_TEXT = '#141619', '#EDEEF0', 0.10, 1.00
LIGHT_SURFACE, LIGHT_TEXT, LIGHT_TINT_FILL, LIGHT_TINT_TEXT = '#FFFFFF', '#16181B', 0.12, 0.41


def _px(h: str) -> tuple[int, int, int]:
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _mix(a: str, b: str, pa: float) -> str:
    A, B = _px(a), _px(b)
    return '#%02X%02X%02X' % tuple(round(A[i] * pa + B[i] * (1 - pa)) for i in range(3))


def _relL(h: str) -> float:
    return sum(c * v for c, v in zip(
        (0.2126, 0.7152, 0.0722), (_srgb_to_lin(x / 255) for x in _px(h))))


def _contrast(a: str, b: str) -> float:
    la, lb = _relL(a), _relL(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def usable(hexv: str, minimum: float = 4.5) -> bool:
    dark = _contrast(_mix(hexv, DARK_TEXT, DARK_TINT_TEXT),
                     _mix(hexv, DARK_SURFACE, DARK_TINT_FILL))
    light = _contrast(_mix(hexv, LIGHT_TEXT, LIGHT_TINT_TEXT),
                      _mix(hexv, LIGHT_SURFACE, LIGHT_TINT_FILL))
    return dark >= minimum and light >= minimum


def hue_deg(hexv: str) -> float:
    h = hexv.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    return colorsys.rgb_to_hls(r, g, b)[0] * 360


def candidates(path: Path, keep: int = 14) -> list[tuple[str, float, int]]:
    """Every usable colour this animation paints, best first."""
    raw = collect(json.load(path.open()), [])
    counts = Counter(tuple(round(x, 3) for x in c) for c in raw)
    out = []
    for rgb, n in counts.items():
        sc = score(rgb, n)
        if sc <= 0:
            continue
        for v in variants(rgb):
            if usable(v):
                out.append((v, sc, n))
    # Collapse accents that a viewer could not tell apart anyway.
    seen: list[tuple[str, float, int]] = []
    for hexv, sc, n in sorted(out, key=lambda t: -t[1]):
        if all(delta_e(hexv, k[0]) > 9 for k in seen):
            seen.append((hexv, sc, n))
    return seen[:keep]


def min_sep(hexv: str, taken: list[str]) -> float:
    """Smallest hue distance from an accent to any already-assigned accent."""
    if not taken:
        return 360.0
    h = hue_deg(hexv)
    return min(min(abs(h - hue_deg(t)), 360 - abs(h - hue_deg(t))) for t in taken)


def pair_sep(a: str, b: str) -> float:
    return delta_e(a, b)


def global_min(picks: dict[str, str]) -> float:
    vals = list(picks.values())
    return min(
        (pair_sep(vals[i], vals[j]) for i in range(len(vals)) for j in range(i + 1, len(vals))),
        default=1000.0,
    )


def assign(pools: dict[str, list[tuple[str, float, int]]], seed: int = 20260920) -> dict[str, str]:
    """
    Give every collection a colour drawn from its own artwork, while keeping the
    fourteen as far apart in hue as that artwork allows.

    The icon set reuses one house palette, so taking each icon's single most dominant
    colour yields five hues for fourteen collections — the browse grid would lose the
    at-a-glance colour coding that makes it scannable. Each collection therefore picks
    from its own icon's full palette, and the assignment maximises the *global* minimum
    hue separation rather than settling greedily. Hill-climbing from several random
    starts, keeping the best; deterministic for a fixed seed.
    """
    rng = random.Random(seed)
    codes = list(pools)
    best_picks: dict[str, str] = {}
    best_obj = -1.0

    for _restart in range(400):
        picks = {c: rng.choice(pools[c])[0] for c in codes}
        obj = global_min(picks)
        improved = True
        while improved:
            improved = False
            for c in codes:
                for cand, _sc, _n in pools[c]:
                    if cand == picks[c]:
                        continue
                    trial = dict(picks)
                    trial[c] = cand
                    t = global_min(trial)
                    if t > obj + 1e-9:
                        picks, obj, improved = trial, t, True
        if obj > best_obj:
            best_obj, best_picks = obj, picks

    # Among equally-separated solutions prefer the more dominant colour in each icon.
    for c in codes:
        others = [v for k, v in best_picks.items() if k != c]
        cur_rank = [h for h, _s, _n in pools[c]].index(best_picks[c])
        for rank, (cand, _sc, _n) in enumerate(pools[c]):
            if rank >= cur_rank:
                break
            if min((pair_sep(cand, o) for o in others), default=1000) >= best_obj - 1e-9:
                best_picks[c] = cand
                cur_rank = rank
    return best_picks


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--write', action='store_true', help='patch src/lib/categories.ts')
    args = ap.parse_args()

    pools: dict[str, list[tuple[str, float, int]]] = {}
    for cat in CATEGORIES:
        code = cat['code']
        f = ICONS / (ICON_FOR[code] + '.json')
        if not f.is_file():
            print(f'  !! missing {f.name}', file=sys.stderr)
            continue
        pool = candidates(f)
        if not pool:  # nothing in this icon clears contrast in both themes

            print(f'  !! {code}: no usable colour in {f.name}', file=sys.stderr)
            continue
        pools[code] = pool

    results = assign(pools)

    print('  collection  icon                        accent    hue   palette drawn from')
    for cat in CATEGORIES:
        c = cat['code']
        if c not in results:
            continue
        pool = [h for h, _s, _n in pools[c]]
        rank = pool.index(results[c]) + 1
        print(f'  {c:^10}  {ICON_FOR[c]+".json":26}  {results[c]}  {hue_deg(results[c]):4.0f}°'
              f'   #{rank} of {len(pool)} in its own icon')

    print('\n  perceptual separation (CIELAB deltaE, closest pairs):')
    pairs = sorted(
        ((delta_e(x[1], y[1]), x[0], x[1], y[0], y[1])
         for i, x in enumerate(results.items()) for y in list(results.items())[i + 1:]),
        key=lambda t: t[0],
    )
    for d, ca, ha, cb, hb in pairs[:6]:
        print(f'     {ca} {ha}  vs  {cb} {hb}   dE {d:5.1f}')
    print(f'  smallest deltaE: {pairs[0][0]:.1f}   (>=25 reads as clearly different)')

    print('\n  contrast of each accent as subtitle text on its own tinted card:')
    worst_d = worst_l = 99.0
    for c, hexv in results.items():
        d = _contrast(_mix(hexv, DARK_TEXT, DARK_TINT_TEXT),
                      _mix(hexv, DARK_SURFACE, DARK_TINT_FILL))
        li = _contrast(_mix(hexv, LIGHT_TEXT, LIGHT_TINT_TEXT),
                       _mix(hexv, LIGHT_SURFACE, LIGHT_TINT_FILL))
        worst_d, worst_l = min(worst_d, d), min(worst_l, li)
    print(f'     dark  worst {worst_d:.2f}:1     light worst {worst_l:.2f}:1     '
          f'{"all pass AA" if min(worst_d, worst_l) >= 4.5 else "FAILS"}')

    if args.write:
        p = Path(__file__).resolve().parents[1] / 'src' / 'lib' / 'categories.ts'
        s = p.read_text()
        start = s.index('export const CATEGORY_COLORS')
        end = s.index('};', start) + 2
        body = ('/**\n'
                ' * Accents are sampled from each collection\'s own Lottie animation by\n'
                ' * `tools/lottie_colors.py`, so a card\'s colour matches the icon sitting on it.\n'
                ' * The icon set shares one house palette, so each collection takes the colour from\n'
                ' * its own artwork that keeps the fourteen furthest apart in hue — colour coding in\n'
                ' * the browse grid still works. Re-run `npm run colors` after changing an icon.\n'
                ' */\n'
                'export const CATEGORY_COLORS: Record<string, string> = {\n')
        for cat in CATEGORIES:
            c = cat['code']
            if c in results:
                body += f"  {c}: '{results[c]}',\n"
        body += '};'
        p.write_text(s[:start] + body + s[end:])
        print('\n  wrote src/lib/categories.ts')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

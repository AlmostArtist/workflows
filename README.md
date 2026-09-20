# Workflows

**Workflows by ShopOS.ai** — browse, search and download the workflow library.

A searchable, filterable, downloadable front end for **52,160 pre-built
`vibe-workflow-export` node graphs** across **14 collections**, built directly from the JSON
files in the parent directory. Every number in the interface is computed by re-parsing the
real files, not copied from a manifest.

---

## Quick start

```bash
npm install
npm run extract      # parse all 52,160 workflow files -> data/  (~3s)
npm run build
npm run start        # http://localhost:3000
```

For development: `npm run dev`.

If the library lives somewhere other than the parent directory, set
`WORKFLOWS_LIBRARY_ROOT` (see `.env.example`). The extractor takes `--library` for the same
purpose.

---

## What was found in the library

The build brief described nine categories (A–I, 50,000 files). The directory also contains
five further collections of the same `vibe-workflow-export` format, so all of them are
indexed — 52,160 files in total, as the brief asked.

| Code | Folder | Collection | Files |
|---|---|---|---|
| A | `A/` | Product catalogues | 4,000 |
| B | `B/` | Editorial frames | 2,500 |
| C | `C/` | Character sheets | 1,500 |
| D | `D/` | Relight composites | 1,000 |
| E | `E/` | Poster / social | 1,000 |
| F | `F/` | Reshoot director | 12,000 |
| G | `G/` | 30s from 3×10s | 12,000 |
| H | `H/` | Brand campaign ads | 8,000 |
| I | `I/` | Viral short-form | 8,000 |
| J | `500-Omni-Images/` | Omni image systems | 500 |
| K | `image/` | Product image systems | 210 |
| L | `video/` | Video director systems | 850 |
| M | `viral/` | Viral Omniflash systems | 500 |
| N | `100-Images/` | Image concept packs | 100 |
| | | **Total** | **52,160** |

**All 52,160 files parsed with zero errors.** The corpus holds 668,687 nodes and 857,788
edges, 32 distinct node kinds and 8 models.

### Where the real data differs from the brief

These are stated rather than silently absorbed, because several of them are visible in the UI:

- **32 node kinds, not 27.** The five extra collections add `image-iterator`, `bundle`,
  `video-to-audio`, `select-input` and others.
- **8 models, not 7.** `claude-sonnet-4-6` appears in 1,660 files (all in the J–N
  collections) and is missing from the brief's model table.
- **8 aspect ratios, not 4.** Beyond `1:1` / `3:4` / `9:16` / `16:9`, the extra collections
  also use `4:5`, `2:3`, `3:2` and `3:1`.
- **Ratios live in two places.** Generation nodes carry `config.aspect_ratio`; the dedicated
  `aspect-ratio-input` node carries `config.value`. Both are indexed — reading only the first
  would have left categories D and E showing no ratios at all.
- **17,662 files shared a `doc.name` with a sibling** (34% of the catalogue — every grade
  variant of an F reshoot carries one name, for example). Rendering those verbatim gives a
  browse list with ten identical rows. The extractor detects colliding titles within a
  collection and appends the filename tokens that actually differ, so all 52,160 rows are now
  distinguishable: *"F — animal rescue clip reshoot, anamorphic wide pass, 4 shots — **eterna**"*.
- **"0 import errors" is real.** The hero stat is the extractor's parse-failure count, which
  is 0 across all 52,160 files.

---

## Architecture

### Data pipeline — `tools/extract.py`

One pass over every file, in parallel, writing four artifacts into `data/`:

| File | Size | Contents |
|---|---|---|
| `catalog.json` | 14 MB | Columnar, dictionary-encoded row per workflow — everything list, filter and search need |
| `details/00–63.json` | 92 MB | 64 shards of per-workflow detail: pipeline, stages, node kinds, required inputs, graph encoding, stage notes |
| `facets.json` | 12 KB | Global facet space, category metadata, integrity counts |
| `paths.json` | 4 MB | Workflow id → source file path, used by the download route |

Per-file extraction pulls the §2 schema out of the actual graph: node kinds and counts,
`config.model` values, aspect ratios, output type (inferred from which generation kinds are
present), file size, required inputs (input nodes whose value field is blank — the ones the
catalogue deliberately ships empty), export date, filename tags, and the pipeline string built
from the real left-to-right `position.x` ordering.

Summaries are the workflow's own **sticky-note stage text** rather than generated prose —
category A's summary is literally what its `STAGE 1` note says.

Re-run with `npm run extract` after changing the library.

### Search — in-process, no external service

The brief suggested Meilisearch/Typesense/Algolia. At this scale none is necessary, and
requiring one would mean the site cannot run without standing up infrastructure first. Instead
`src/lib/catalog.ts` loads the catalogue into **typed-array columns** once per process
(~1.6 MB of numeric columns) and `src/lib/search.ts` scans them:

- Category, model, ratio and node-kind filters are **bitmask tests**, not array scans.
- Free text runs against an **inverted index** over titles, filename tags, model names and
  node kinds, with AND semantics, idf scoring, prefix expansion on the trailing token for
  typeahead, and single-edit typo tolerance.
- Facet counts for each dimension are computed with **that dimension's own selection
  excluded**, so a checkbox always states how many results it would actually add (§7.2).

Measured on the full 52,160-row index:

```
/api/search                                   total=52,160   8.9 ms
/api/search?category=F&output=video           total=12,000   2.2 ms
/api/search?q=dance                           total=344      0.3 ms
/api/search?model=seedance-2.5&ratio=9:16     total=8,992    1.9 ms
```

Comfortably inside the brief's sub-50 ms target, with no service to run. If you later want
Meilisearch anyway, `runSearch()` is the single seam to swap.

### Node-graph thumbnails — generated, not stored

§7.5 asked for an SVG generated per workflow at build time. Generating 52,160 SVG files would
cost roughly 100 MB of small files for images that are cheap to draw. The extractor instead
stores a **compact layered encoding** of each graph — `[kindIndex, layer, rank]` per node plus
edge index pairs, taken from the files' own `position.x`/`position.y` — and
`src/lib/graph.ts` lays that out deterministically at render time. Same input, same picture,
every time; the pipeline really is the artwork, and a 6-way catalogue fan-out is instantly
distinguishable from a linear reshoot chain.

Nodes are coloured by role (input, text-gen, generation in the category accent, transform,
output as an open stroke), with a legend on the detail page so colour is never the only signal.

### Detail pages

Rendered on demand rather than pre-building 52,160 HTML files. A render costs one shard read,
so builds stay at seconds instead of hours, and the 14 category landing pages are still
statically generated.

### Handing a workflow to ShopOS

Every card and the detail page carry an **Open in ShopOS** action. It fetches the workflow's
JSON, copies it to the clipboard, and opens a dialog that states what happened and links to
the Spacelab canvas and to *Your spaces*.

It copies and pastes rather than importing directly because **ShopOS has no documented
URL-driven import**, and inventing an endpoint would produce a button that silently does
nothing. If the platform gains one, set `NEXT_PUBLIC_SHOPOS_IMPORT_URL` to a template
containing `{url}` (the public URL of the `.json`) and/or `{id}`; the button then navigates
straight there and skips the clipboard step. No other code changes. The canvas and spaces URLs
are configurable too — see `.env.example`.

The copy path degrades properly: async Clipboard API first, then a `textarea` +
`execCommand` fallback for non-secure contexts, and if both are refused the dialog says so
and offers the download instead. It never navigates the page away behind the user's back.

### Downloads — `/api/download/[id]`

Streams the **actual file** from the library folder — verified byte-identical to the source —
sets `Content-Disposition` to the original filename, and increments a per-workflow counter that
powers the "Most downloaded" sort. Nothing is zipped or unzipped per request. Paths are
resolved against `WORKFLOWS_LIBRARY_ROOT` and validated to stay inside it.

#### Netlify and other serverless hosts

The complete workflow library is committed in `workflow-files/` in the public GitHub repository.
On Netlify, `/api/download/[id]` fetches the matching raw file server-side and returns it as a
same-origin `.json` attachment. Visitors therefore download only from the website—no local
server, browser GitHub redirect, or object-storage configuration is required.

`WORKFLOWS_DOWNLOAD_BASE_URL` remains available only if you later want to use a custom CDN or
storage mirror. Do not put a runtime override only in `netlify.toml`; Netlify does not expose
those variables to functions at runtime.

Counters live in `data/counters.json` (in-memory, debounced flush). Swap `load`/`persist` in
`src/lib/counters.ts` for a KV client if you deploy more than one instance.

---

## Design system

All tokens live in `tailwind.config.ts` and `src/app/globals.css`. **No component contains a
hardcoded hex value** — the only inline colours are category accents read from the token map.

### Two themes — light by default

**Light is the default and opens unconditionally.** Only a visitor who has previously chosen
dark gets dark; the OS `prefers-color-scheme` does not override the product's own default.
Dark is a full second theme rather than an inversion: same ember accent, same fourteen
category hues, on graphite instead of paper.

The toggle lives in the nav, persists to `localStorage`, and is applied by an inline script in
`<head>` before first paint, so the page never flashes the wrong theme.

### Category accents come from the artwork

`tools/lottie_colors.py` (`npm run colors`) reads every collection's Lottie file, collects the
colours it actually paints, and derives the accent from them — so a card's tint matches the
icon sitting on it.

Two things made this non-trivial and are worth knowing:

- **The icon set shares one house palette** — navy, teal, yellow, red — with no greens at all.
  Taking each icon's single most dominant colour gave **five hues for fourteen collections**,
  which would have destroyed the at-a-glance colour coding the browse grid depends on. Each
  collection therefore picks from its *own* icon's full palette, and the assignment maximises
  the global minimum separation by hill-climbing from 400 random starts.
- **Hue distance alone was the wrong metric.** Separation is measured as CIELAB ΔE, so a deep
  blue and a pale blue count as genuinely different. Every candidate is also gated on clearing
  WCAG AA *as subtitle text on its own tinted card, in both themes* — a palette that looks fine
  in isolation and fails in use is not a palette.

Shipped result: closest pair ΔE **20.9**, worst card-subtitle contrast **4.73:1** (dark) and
**5.26:1** (light). Re-run `npm run colors` after changing any icon.

Category tints are one component definition in both themes. `tintVars()` emits
`--c-fill` / `--c-border` / `--c-text` as `color-mix()` expressions driven by three
theme-level alphas, so a collection card is authored once and resolves correctly on either
ground.

### Motion

Lottie animations (33 of them, in `public/icons`) carry every collection glyph, the wordmark
and the step icons, and they are sized to be the subject of their tile rather than a bullet —
the glyph fills 86% of its container, feature tiles run at 56px and the detail-page header at
76px. They are lazy: nothing is bundled, each file is fetched only once it is within 200px of
the viewport, each is cached per session, and the player itself is a dynamic import —
`lottie-web` never enters the shared bundle (First Load JS is unchanged at 103 kB). Playback
follows intent — icons rest on a still frame and animate on hover, so a browse grid is not
thirty looping animations at once.

The landing hero runs a generated canvas of drifting node lanes; drop a `public/hero.mp4` in
and it switches to that video automatically, no code change.

`prefers-reduced-motion` disables the counter roll, the entrance stagger, the hero canvas and
all Lottie playback, leaving static frames.

### Additions to the brief's palette

§4.2 assigns `--text-tertiary` (`#5B5F66`) to *"disabled, placeholder"*, and §9 requires WCAG
AA contrast. Those two requirements conflict as soon as tertiary is used for anything that is
real content: at **2.58:1 on `--bg-surface-2`** it fails AA badly. Facet counts, file sizes and
node counts are content, not decoration.

So the system adds one step, **`--text-meta` (`#82868D`)**, which clears AA on every surface
(4.52:1 on `--bg-surface-2`, 5.35:1 on `--bg-canvas`). Tertiary is now used strictly as the
brief defines it — placeholders, disabled controls and `aria-hidden` separators, all of which
WCAG exempts.

Measured contrast, dark theme:

| | canvas | surface | surface-2 | inset |
|---|---|---|---|---|
| `--text-primary` | 16.86 | 15.61 | 14.25 | 17.17 |
| `--text-secondary` | 7.45 | 6.90 | **6.30** | 7.58 |
| `--text-meta` | 5.35 | 4.96 | **4.52** | 5.45 |
| `--ember` | 7.50 | 6.95 | 6.34 | 7.64 |

The brief singles out `--text-secondary` on `--bg-surface-2` as the tightest pair: **6.30:1**,
passing AA for body text.

The light theme needed the same treatment from scratch. Its first draft failed in five places
(`--ember` at 3.42:1, `--signal-image` at 3.58:1 among them), so every content token was
re-solved against `--bg-inset`, the lightest surface any of them sits on. All now clear
**4.6:1 or better**, and white-on-ember buttons measure 5.53:1.

The category tints needed solving too. Mixing a hue 72% toward the page text — fine on
graphite — left collection I's yellow-lime at **2.25:1** on paper. `--tint-text` is now
**0.41** in light mode: the *most* hue that still clears AA on every one of the fourteen
tinted cards (worst case 4.68:1). The collections stay colour-coded instead of collapsing to
near-black.

`--text-tertiary` is the one token that stays light in both themes, because it is used only
for placeholders, disabled controls and `aria-hidden` separators, which WCAG exempts.

### Motion

One moment, as specified: the homepage counters roll once on first paint. Card hover is a
120 ms colour change — no scale, no lift, no shadow. Filter changes cross-fade the result grid
rather than reflowing it. `prefers-reduced-motion` snaps everything instantly (verified: the
counter reads 52,160 immediately under reduced motion).

---

## Routes

| Route | Rendering | Notes |
|---|---|---|
| `/` | static | Motion hero with live search, Top 10 rail, collection bento wall, newest strip, four-step explainer, CTA |
| — | — | Every workflow surface carries **Open in ShopOS** alongside the download |
| `/browse` | dynamic + client | The product. Virtualized list/grid, filter rail, URL-synced |
| `/categories` | static | All 14 collections with real descriptions |
| `/categories/[code]` | static (14) | Pre-filtered browse with the collection's pipeline shape |
| `/workflow/[id]` | on demand | Node graph, pipeline facts, required inputs, stage notes, related |
| `/search?q=` | redirect | Preserves the IA; hands off to `/browse` |
| `/docs/importing` | static | Import guide plus full node-kind / model / ratio reference |
| `/api/search`, `/api/suggest`, `/api/graphs`, `/api/download/[id]` | dynamic | |

Every filter, sort, view mode and page is in the query string, so results are bookmarkable and
browser back/forward works (verified).

---

## Verified behaviour

- All 52,160 files parse; 0 errors.
- Detail page and download checked for 2 random workflows in each of the 14 collections — 28/28 pass.
- Downloaded file is byte-identical to the library source (`diff` clean).
- ⌘K opens from any page, typeahead groups by collection, Esc closes.
- Filter click → URL updates → server re-queries → facet counts recompute; `history.back()`
  restores the previous result set.
- Virtualized list holds ~18 DOM rows for a 12,000-result set.
- Keyboard tab order reaches controls with a 2px ember focus ring.
- Empty states name the conflict: *"Clearing Model would return 36,131 workflows — topaz only
  appears in collections D, J, M, N."*
- Responsive at 390 / 820 / 1440 px; mobile gets its own nav strip, two-line titles and 44px
  touch targets.
- Light theme is the default on a fresh profile; the toggle flips tokens, writes
  `localStorage` and survives navigation. Dark keeps browse fully functional (18 virtualized
  rows, correct counts).
- **Open in ShopOS** puts the real file on the clipboard — verified with a genuine dispatched
  click: `vibe-workflow-export`, 17 nodes, parsed back from the clipboard.
- All 14 category accents pass AA on their own tinted cards in both themes, closest pair
  ΔE 20.9.
- Lottie icons mount and animate; only the icons near the viewport are fetched.
- Hero live search returns results inline as you type, with keyboard navigation.
- Top 10 renders all ten hollow rank numerals and scrolls by rail button.
- No console errors or exceptions on any page, in either theme.

## Notes on the redesign

- **Top 10 is honest about its basis.** With download history it ranks by downloads and the
  heading reads *"Top 10 this week"*. With none, it ranks by pipeline depth spread across
  collections and the heading reads *"Top 10 to start with"*, with the caption saying it
  switches once counters have data. It never claims popularity it cannot evidence.
- **The hero background is generated, not stock.** No video asset was supplied, so the
  default is a canvas animation of the product's own subject matter. `public/hero.mp4` takes
  over automatically if you add one (a `hero-poster.jpg` is used as its poster frame).
- **The counters were reset.** The 30 downloads recorded during verification were my own test
  traffic, not real usage, so `data/counters.json` was cleared before handover.

## Known limits

- Download counters are per-process and file-backed; multi-instance deployments need a shared
  store (one function to swap).
- Full-text search is AND across tokens by design — `product catalogue` returns only files
  containing both words. Loosening this to OR-with-ranking is a one-line change in `matchText`.
- The five extra collections (J–N) were produced by a different generator run than A–I, so
  their titles are hand-written rather than parametric. They are indexed identically but read
  differently in a mixed result list.
- Collections J–N reuse animations from the generic pool in `public/icons`, since the supplied
  set contains purpose-made art only for A–I. Re-pointing any of them is one line in
  `src/lib/icon-map.ts` — re-run `npm run colors` afterwards so the accent follows the icon.
- The ShopOS handoff is copy-and-paste, not a true API import, because no import endpoint is
  documented. One env var switches it to a direct import if that changes.
- Webfonts load from Google Fonts. The stack falls back to the platform UI sans if that is
  blocked; self-host `Inter` and `JetBrains Mono` if you need the site fully offline.

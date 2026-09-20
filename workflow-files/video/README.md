# 1,560 generated workflows — from your three library documents

Every system in your three reference documents is now an importable
`vibe-workflow-export` JSON file.

| Library | Systems | Files | Nodes | Edges |
|---|---|---|---|---|
| IMAGE_WORKFLOWS.md | 210 | `image/` | 4,180 | 8,060 |
| VIDEO_WORKFLOWS.md | 850 | `video/` | 23,790 | 61,050 |
| VIRAL_OMNIFLASH_WORKFLOWS.md | 500 | `viral/` | 12,335 | 24,820 |
| **Total** | **1,560** | | **40,305** | **93,930** |

All 1,560 passed schema validation: ULID IDs, real edge endpoints, correct handle
names per node kind, and every `appendable_slots` family contiguous from 0 and fully
wired. Each library folder has its own `INDEX_*.md` listing every file, its system ID,
its section and its node shape.

## How your library maps onto real platform nodes

Your documents describe pipelines in production language. Each stage became a real node:

| Your term | Platform node |
|---|---|
| Ingestion | `reference-image-input`, `image-input-multi`, `video-input`, `character-input`, `pose-input` |
| Product / Label / Brand / Identity / Source Forensics, Structured Memory | `text-gen` (forensics analyst, strict-JSON spec) |
| Any Director (angle, scene, grid, persona, culinary, VFX, campaign, trend, template, mode) | `text-gen` with a role-specific system prompt |
| Nano Banana Pro generation / keyframes | `image-gen`, model `gemini-3-pro-image-preview`, eval model `gemini-2.5-pro` |
| Omni Flash 1.1 motion | `video-reference` / `video-gen`, model `gemini-omni-1.1-flash` |
| Omni Flash video-to-video, conversational edit turns, LUT grade match | `video-edit`, model `gemini-omni-1.1-flash` |
| Video Analyzer forensics | `video-analyzer` + `video-frame-extract` frame grabs |
| Consistency / Identity / Continuity / Fidelity / Physics / Brand-Fit Critic | `text-gen` critic with the generated assets wired into its reference slots |
| Failure Vector Classifier + Targeted Repair | `text-gen` repair director feeding a single isolated `image-gen` or `video-reference` |
| Video Concat / re-splice | `video-concat` |
| Audio / music layer | `lyria-3` + `merge-audio-video` |
| Subtitle burn-in | `video-subtitle` |
| Marketplace resize / platform crops | `image-resize` at exact pixel dimensions |
| Magnific-style upscale, delivery promote | `upscaler` (Topaz, 4x) |
| Trend Scanner / reference scrape | `text-input` + `concat` → `pinterest-scraper` → `image-randomizer` |
| Package | `download` (terminal node) plus `includeInOutput` on deliverables |

Each file also carries sticky notes: the first one reproduces that system's pipeline
line from your document, and one per stage explains what that stage does.

## The backend prompts

Every `text-gen` node carries a full structured system prompt — no node has a
one-liner, and the shortest prompt in the pack is over 1,200 characters. Each is built
from the same skeleton:

- **ROLE** — what this node is and what it must never do
- **PIPELINE CONTEXT** — the system's library, section, ID, subject, treatment, declared
  models, declared input, its full pipeline string, the QC stage that will judge it, and
  the package the pipeline owes. Every node knows exactly where it sits
- **ORIGINAL DIRECTOR SEED** — your document's own seed prompt, quoted verbatim and
  marked binding
- **METHOD** — numbered, role-specific working steps
- **HARD CONSTRAINTS** — what cannot be invented, changed or beautified
- **MODEL RULES** — the Nano Banana Pro image-prompt block (word budget, information
  order, real hardware, materials by optical behaviour, product-lock restatement, ban
  list) or the Omni Flash 1.1 video block (one measured camera move, explicit first and
  last frame, one primary plus one secondary motion, continuity restated verbatim)
- **OUTPUT CONTRACT** — a strict JSON schema, so downstream nodes get parseable structure
- **SELF-CHECK** — five questions before emitting

Critic nodes implement your document's own QC line, score each axis 0-100, emit a
failure vector and a repair route, and escalate to human review after two failed
repairs — exactly as your libraries specify.

## Before you import

1. **Fill in the blank URLs.** Every input node ships empty. No asset URLs were invented.
2. **Edit the brief nodes.** `prompt` nodes named "…brief — edit before running" hold
   placeholder text describing what to supply. The system prompts underneath do not need
   editing.
3. **Start with one file per section** to confirm handle behaviour before batch-importing.

## Known uncertainties

- Your documents describe "Nano Banana Pro keyframe → Omni Flash animates that keyframe".
  The platform's newest export confirms only the `prompt` handle on video nodes;
  `video-gen`'s singular `first_frame` and `video-reference`'s `reference_images__N` are
  both carried over from the pre-consolidation node kinds. Keyframes are therefore wired
  into `video-reference`'s `reference_images__0` — the handle with the stronger record of
  importing successfully — rather than `first_frame`. If your platform prefers
  `first_frame`, it is a one-line change per file.
- `video-analyzer`'s text output and `video-frame-extract`'s image output are also
  best-guess (no downstream edge existed in the reference export). The camera-transfer
  and QA-repair sections depend on both — test one of those first.
- `lyria-3`'s audio output is logical but unconfirmed.
- `moodboard` and `brand-memory` nodes were deliberately not used: their handles are
  unknown and guessing would fail the import. Moodboard behaviour is built instead from
  `image-input-multi` → `image-iterator` → `bundle` plus a moodboard-forensics `text-gen`,
  which is confirmed wiring. Export a small test workflow using either node and they can
  be wired properly.

## Models used across the pack

| Role | Model | Nodes |
|---|---|---|
| Direction, forensics, critics, repair | `claude-sonnet-4-6` | 11,825 |
| Video generation and editing | `gemini-omni-1.1-flash` | 5,645 |
| Image generation | `gemini-3-pro-image-preview` (+ `gemini-2.5-pro` eval) | 4,905 |
| Score | `lyria-3-clip-preview` | 210 |
| Upscale | `topaz` Standard V2, 4x | 180 |

Engine choice is a `config.model` string on the same node kind — swapping in any other
engine from your dropdown needs no structural change.

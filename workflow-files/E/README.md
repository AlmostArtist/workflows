# Category E — Poster / social-post / thumbnail graphics — 3 ratios per pass

1000 workflow files, one importable `vibe-workflow-export` JSON each.

## What these do

The campaign brief and the exact copy deck are concatenated so identical strings reach
every ratio. Three layout writers each own one aspect ratio, each fed by its own
aspect-ratio-input control node, and each image-gen also receives the brand logo asset.
Every artwork is resized to a clean export dimension before download.

Pipeline: prompt + text-input -> concat -> 3x text-gen -> 3x image-gen -> image-resize -> download

## Before you import

Every input node that needs a real asset is left blank on purpose — no invented URLs.
Fill these in after import:
  - Logo / brand asset * — paste the logo URL
  - Exact copy deck — replace the [bracketed] strings

Anything in [square brackets] inside a prompt or text-input node is a placeholder for you
to replace; the workflow still runs if you leave it, but the output will be generic.

## Models used

  text-gen ......... gpt-5.5
  image-gen ........ gemini-3-pro-image-preview (primary) / gemini-3.1-flash-image-preview
  video ............ gemini-omni-1.1-flash (primary) / seedance-2.5
  upscaler ......... topaz, Standard V2
  music ............ lyria-3-clip-preview

Numeric/enum config fields (resolution 720p, image_size 1K, aspect ratios 1:1 / 3:4 / 9:16 /
16:9, subtitle preset, upscale factor) are set only to values confirmed present in real
platform exports. Bump them in the UI after import if your account supports higher tiers.

## File naming

  E_<industry-or-domain>_<distinguishing-detail>.json

## Validation

Every file in this ZIP was checked for: JSON parse; ULID-format node and edge ids; unique ids;
every edge source/target resolving to a real node; correct source/target handle names per node
kind; and every appendable_slots family filled contiguously from 0 with no gaps or overflow.
No legacy per-model video node kinds are present anywhere.

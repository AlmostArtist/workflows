# Category D — Background / object replacement, bg-remove + relight

1000 workflow files, one importable `vibe-workflow-export` JSON each.

## What these do

The subject is cut out with bg-remove, destination plates arrive on a background-input,
and a relight director reconciles the two: key direction in degrees, colour-temperature
delta, contact shadow, edge light, grain and aberration match. Two treatment variants render
per workflow, each upscaled before download. Output ratio is driven by an aspect-ratio-input
control node rather than hardcoded.

Pipeline: image-input -> bg-remove -> relight director -> image-gen -> upscaler -> download

## Before you import

Every input node that needs a real asset is left blank on purpose — no invented URLs.
Fill these in after import:
  - Subject image — the product/subject to cut out
  - Destination plates — one or more background plate URLs

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

  D_<industry-or-domain>_<distinguishing-detail>.json

## Validation

Every file in this ZIP was checked for: JSON parse; ULID-format node and edge ids; unique ids;
every edge source/target resolving to a real node; correct source/target handle names per node
kind; and every appendable_slots family filled contiguously from 0 with no gaps or overflow.
No legacy per-model video node kinds are present anywhere.

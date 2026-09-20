# Category B — Editorial / cinematic character frames — male & female leads

2500 workflow files, one importable `vibe-workflow-export` JSON each.

## What these do

Cast references enter once. A continuity-lock text-gen node writes a single binding
description of both leads (face, hair, build, wardrobe piece by piece, location, grade),
and every frame writer restates that block, so the same two people appear in every frame
with only pose, framing and light changing.

Pipeline: character-input + prompt (brief) -> continuity lock -> N x text-gen -> N x image-gen -> download

## Before you import

Every input node that needs a real asset is left blank on purpose — no invented URLs.
Fill these in after import:
  - Cast references — paste the female and male lead reference URLs

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

  B_<industry-or-domain>_<distinguishing-detail>.json

## Validation

Every file in this ZIP was checked for: JSON parse; ULID-format node and edge ids; unique ids;
every edge source/target resolving to a real node; correct source/target handle names per node
kind; and every appendable_slots family filled contiguously from 0 with no gaps or overflow.
No legacy per-model video node kinds are present anywhere.

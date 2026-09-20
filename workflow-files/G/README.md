# Category G — 30-second video from 3 x 10s segments, merged

12000 workflow files, one importable `vibe-workflow-export` JSON each.

## What these do

A concept writer plans a three-act 30-second narrative and emits three distinct 10-second
segment briefs, carrying one fixed continuity block (face, wardrobe, hero prop, location,
lens family, grade). Three act writers each expand their own act with internal timecodes at
0-3s / 3-7s / 7-10s. Three video-reference nodes render 10 seconds each in parallel against
the same reference image, then video-concat merges them in order.

Pipeline: reference-image-input + prompt -> concept writer -> 3x act writer
          -> 3x video-reference (10s) -> video-concat -> download

## Before you import

Every input node that needs a real asset is left blank on purpose — no invented URLs.
Fill these in after import:
  - Continuity reference * — the face / product / location still that all three acts inherit

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

  G_<industry-or-domain>_<distinguishing-detail>.json

## Validation

Every file in this ZIP was checked for: JSON parse; ULID-format node and edge ids; unique ids;
every edge source/target resolving to a real node; correct source/target handle names per node
kind; and every appendable_slots family filled contiguously from 0 with no gaps or overflow.
No legacy per-model video node kinds are present anywhere.

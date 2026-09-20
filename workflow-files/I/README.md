# Category I — General trending / viral short-form formats

8000 workflow files, one importable `vibe-workflow-export` JSON each.

## What these do

Four structural variants rotate across the set:
  - hook-first-frame : format director -> opening-frame writer -> image-gen -> video-gen (first_frame)
  - asmr-foley       : format director -> silent video-gen -> video-to-audio -> merge-audio-video
  - transformation   : before image -> after-state writer -> image-gen -> video-reference (both frames)
  - text-reveal      : brief + copy -> concat -> video-gen -> video-subtitle + lyria-3 -> merge
All are composed 9:16, sound-on, with a beat every 2-3 seconds and the retention load on the
first 1.5 seconds.

## Before you import

Every input node that needs a real asset is left blank on purpose — no invented URLs.
Fill these in after import:
  - Before image (transformation-reveal variants only)
  - On-screen copy / music brief — replace the [bracketed] strings

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

  I_<industry-or-domain>_<distinguishing-detail>.json

## Validation

Every file in this ZIP was checked for: JSON parse; ULID-format node and edge ids; unique ids;
every edge source/target resolving to a real node; correct source/target handle names per node
kind; and every appendable_slots family filled contiguously from 0 with no gaps or overflow.
No legacy per-model video node kinds are present anywhere.

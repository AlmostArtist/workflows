# Category F — Reference-video reshoot director

12000 workflow files, one importable `vibe-workflow-export` JSON each.

## What these do

The source clip is analysed factually (runtime, wardrobe, action beats, existing camera
treatment), that analysis is concatenated with the reshoot brief, and a camera-angle director
converts it into a timecoded shot list covering the full source duration with contiguous
timecodes and no repeated angle back-to-back. A cinematic prompt writer fuses that list into
one production prompt that preserves subject, action and environment while overriding only
the camera. video-edit reshoots the original clip.

Pipeline: video-input -> video-analyzer -> concat -> shot-list director
          -> cinematic prompt writer -> video-edit -> download

## Before you import

Every input node that needs a real asset is left blank on purpose — no invented URLs.
Fill these in after import:
  - Source clip * — paste the URL of the video you want reshot

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

  F_<industry-or-domain>_<distinguishing-detail>.json

## Validation

Every file in this ZIP was checked for: JSON parse; ULID-format node and edge ids; unique ids;
every edge source/target resolving to a real node; correct source/target handle names per node
kind; and every appendable_slots family filled contiguously from 0 with no gaps or overflow.
No legacy per-model video node kinds are present anywhere.

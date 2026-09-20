# Category C — Moodboard / concept-to-multi-angle character sheets

1500 workflow files, one importable `vibe-workflow-export` JSON each.

## What these do

The concept brief is concatenated with a style seed to build a Pinterest query. The
scraper returns a board, the randomiser picks one image as tone reference only, and a
design-lock node fixes silhouette, palette, materials and props. Each turnaround panel
then restates that lock verbatim.

Pipeline: prompt + text-input -> concat -> pinterest-scraper -> image-randomizer
          -> design lock -> N x text-gen -> N x image-gen -> download

## Before you import

Every input node that needs a real asset is left blank on purpose — no invented URLs.
Fill these in after import:
  - No URLs required. The Pinterest query is built from the brief; edit the query seed to steer the board.

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

  C_<industry-or-domain>_<distinguishing-detail>.json

## Validation

Every file in this ZIP was checked for: JSON parse; ULID-format node and edge ids; unique ids;
every edge source/target resolving to a real node; correct source/target handle names per node
kind; and every appendable_slots family filled contiguously from 0 with no gaps or overflow.
No legacy per-model video node kinds are present anywhere.

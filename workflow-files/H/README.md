# Category H — Marketing-studio style commercial / brand campaign ads

8000 workflow files, one importable `vibe-workflow-export` JSON each.

## What these do

Modelled on real marketing-studio template categories: UGC, testimonial, product-in-hand,
before/after, unboxing, explainer, meme-style, founder pitch-to-camera and more. A brand-brief
prompt node feeds a persona script writer tuned to that specific ad format and audience, a shot
director turns the approved script into one video prompt, and a video-reference node renders the
cut against talent and product references. Captions are burned in as a second deliverable.

Pipeline: prompt (brand brief) + character-input + reference-image-input
          -> persona script -> shot director -> video-reference -> video-subtitle -> download

## Before you import

Every input node that needs a real asset is left blank on purpose — no invented URLs.
Fill these in after import:
  - Talent references — creator or actor reference URLs
  - Product / packshot * — the product image URL

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

  H_<industry-or-domain>_<distinguishing-detail>.json

## Validation

Every file in this ZIP was checked for: JSON parse; ULID-format node and edge ids; unique ids;
every edge source/target resolving to a real node; correct source/target handle names per node
kind; and every appendable_slots family filled contiguously from 0 with no gaps or overflow.
No legacy per-model video node kinds are present anywhere.

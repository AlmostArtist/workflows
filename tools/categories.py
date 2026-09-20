"""Category registry — maps every folder in the library to a Workflows category.

Codes A-I are the nine catalogue ZIPs described in 00_INDEX_and_BATCH_STATE.md.
Codes J-N are the additional workflow collections that ship in the same tree.
"""

CATEGORIES = [
    {
        "code": "A",
        "dir": "A",
        "name": "Product catalogues",
        "long_name": "Commercial / product photography catalogues — 6 frames per pass",
        "color": "#E8B84F",
        "icon": "aperture",
        "description": (
            "One product reference fans out to six independently-briefed prompt writers, each "
            "owning a different camera angle, set and lighting scheme. Each writer feeds its own "
            "image-gen node, which also receives the original product reference so geometry, "
            "colourway and label typography stay locked. All six frames land in one download node."
        ),
    },
    {
        "code": "B",
        "dir": "B",
        "name": "Editorial frames",
        "long_name": "Editorial / cinematic male + female lead frames",
        "color": "#E85F9C",
        "icon": "cast",
        "description": (
            "A cast reference pair drives a setting-locked editorial frame set. Register, time of "
            "day and weather are parameterised per file, so the same location yields distinct "
            "cinematic treatments without re-briefing the shoot."
        ),
    },
    {
        "code": "C",
        "dir": "C",
        "name": "Character sheets",
        "long_name": "Moodboard concept → multi-angle character turnaround sheets",
        "color": "#B084E8",
        "icon": "orbit",
        "description": (
            "A moodboard seed is scraped and distilled into a character concept, then rendered as "
            "a multi-angle turnaround sheet. Medium and era are fixed per file so the whole sheet "
            "shares one illustration language."
        ),
    },
    {
        "code": "D",
        "dir": "D",
        "name": "Relight composites",
        "long_name": "Background / object replacement — bg-remove + relight",
        "color": "#4FC9E8",
        "icon": "mask",
        "description": (
            "Subject is cut from its plate, dropped onto a destination background, then relit to "
            "match the new environment's key treatment. The relight pass is what separates this "
            "from a naive cutout composite."
        ),
    },
    {
        "code": "E",
        "dir": "E",
        "name": "Poster / social",
        "long_name": "Poster, social post and thumbnail graphics — 3 ratios",
        "color": "#E8724F",
        "icon": "layout",
        "description": (
            "Exact copy deck plus brand asset render into a graphic layout across three aspect "
            "ratios in one pass, so a single design language ships to poster, feed and thumbnail "
            "slots simultaneously."
        ),
    },
    {
        "code": "F",
        "dir": "F",
        "name": "Reshoot director",
        "long_name": "Reference-video reshoot director",
        "color": "#4FE8A0",
        "icon": "reshoot",
        "description": (
            "Source clip is analysed factually — runtime, wardrobe, action beats, existing camera "
            "treatment — then re-blocked into a multi-shot camera plan with contiguous timecodes. "
            "The reshoot grammar and grade are fixed per file."
        ),
    },
    {
        "code": "G",
        "dir": "G",
        "name": "30s from 3x10s",
        "long_name": "30-second video assembled from 3 × 10s segments, merged",
        "color": "#4FA9E8",
        "icon": "merge",
        "description": (
            "A narrative is split into three ten-second segments, each generated independently "
            "with its own beat brief, then concatenated into a single thirty-second cut. Genre, "
            "subject, setting and tone are parameterised per file."
        ),
    },
    {
        "code": "H",
        "dir": "H",
        "name": "Brand campaign ads",
        "long_name": "Marketing-studio style commercial brand campaign ads",
        "color": "#E8544F",
        "icon": "campaign",
        "description": (
            "Ad format, vertical and audience persona combine into a studio-style campaign spot. "
            "The brief stage writes to the persona, not to the product, which is what makes the "
            "output read as an ad rather than a product demo."
        ),
    },
    {
        "code": "I",
        "dir": "I",
        "name": "Viral short-form",
        "long_name": "General trending / viral short-form formats",
        "color": "#EDE84F",
        "icon": "bolt",
        "description": (
            "Trend format, topic, structure and angle drive a short-form vertical cut. Files "
            "ending -hook-first-frame seed video-gen from a designed first frame; files ending "
            "-text-reveal add a lyria-3 audio bed."
        ),
    },
    {
        "code": "J",
        "dir": "500-Omni-Images",
        "name": "Omni image systems",
        "long_name": "Omni image systems — 500 named multi-stage image programmes",
        "color": "#7FE85F",
        "icon": "grid",
        "description": (
            "Five hundred named image systems, each a deep multi-stage programme — catalogue "
            "grids, ad variant gauntlets, trend radars — built with substantially larger node "
            "graphs than the A-E catalogue shapes."
        ),
    },
    {
        "code": "K",
        "dir": "image",
        "name": "Product image systems",
        "long_name": "Product image systems from IMAGE_WORKFLOWS.md",
        "color": "#E8A05F",
        "icon": "aperture",
        "description": (
            "Two hundred and ten production image systems — angle-lock catalogues, marketplace "
            "spec compliance packs, fidelity QC loops — generated from the IMAGE_WORKFLOWS "
            "library document."
        ),
    },
    {
        "code": "L",
        "dir": "video",
        "name": "Video director systems",
        "long_name": "Video director systems from VIDEO_WORKFLOWS.md",
        "color": "#5F8FE8",
        "icon": "reshoot",
        "description": (
            "Eight hundred and fifty video systems — camera-language transfer, continuity rigs, "
            "multi-pass direction — generated from the VIDEO_WORKFLOWS library document. These "
            "carry the densest edge counts in the catalogue."
        ),
    },
    {
        "code": "M",
        "dir": "viral",
        "name": "Viral Omniflash systems",
        "long_name": "Viral Omniflash systems from VIRAL_OMNIFLASH_WORKFLOWS.md",
        "color": "#E85FD4",
        "icon": "bolt",
        "description": (
            "Five hundred short-form viral systems — thread-to-video recaps, detail hallucination "
            "upscale pipelines, platform-native reveal formats — generated from the "
            "VIRAL_OMNIFLASH_WORKFLOWS library document."
        ),
    },
    {
        "code": "N",
        "dir": "100-Images",
        "name": "Image concept packs",
        "long_name": "Image concept packs — 100 hand-named campaign concepts",
        "color": "#9CE8C4",
        "icon": "layout",
        "description": (
            "One hundred hand-named campaign concepts — trade show loops, kinetic key art, "
            "single-take developing shots — each a self-contained concept pack rather than a "
            "parametric variant."
        ),
    },
]

BY_CODE = {c["code"]: c for c in CATEGORIES}
BY_DIR = {c["dir"]: c for c in CATEGORIES}

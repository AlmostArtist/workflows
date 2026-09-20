#!/usr/bin/env python3
"""Extract Workflows catalogue metadata from every vibe-workflow-export JSON in the library.

Walks all 14 collection folders, parses each file once, and emits:

  data/catalog.json        columnar, dictionary-encoded index of every workflow (list/filter/search)
  data/details/NN.json     64 shards of per-workflow detail (pipeline, node list, graph, inputs)
  data/facets.json         global facet space + category counts
  data/paths.json          id -> absolute source path, used by the download route

The graph stored per workflow is a compact layered encoding of the real nodes/edges, which
the site renders to SVG deterministically (see §7.5 of the build brief). Storing the encoding
rather than 52k rendered SVG files keeps the artifact at tens of MB instead of ~100MB+ while
producing pixel-identical output.

Usage: python3 tools/extract.py [--library PATH] [--out PATH] [--jobs N]
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import time
from collections import Counter
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from categories import CATEGORIES  # noqa: E402

SHARDS = 64

# Node kinds grouped for thumbnail stroke colour + pipeline reasoning.
INPUT_KINDS = {
    "reference-image-input", "image-input", "image-input-multi", "video-input",
    "character-input", "background-input", "pose-input", "text-input",
    "aspect-ratio-input", "select-input", "prompt", "pinterest-scraper",
}
GEN_KINDS = {
    "image-gen", "video-gen", "video-reference", "video-edit", "lyria-3",
}
OUTPUT_KINDS = {"download", "bundle"}
IMAGE_GEN_KINDS = {"image-gen"}
VIDEO_GEN_KINDS = {"video-gen", "video-reference", "video-edit", "video-concat", "video-subtitle"}

# Filename tokens that carry no facet value.
STOPWORDS = {
    "a", "an", "the", "and", "or", "of", "to", "from", "with", "for", "in", "on", "at",
    "as", "by", "is", "it", "that", "this", "its", "omni", "json",
}

TITLE_CLEAN = re.compile(r"^\s*(?:[A-Z]?\d{2,4}\s*[.·—-]\s*|\d+\s*—\s*)")
ID_SAFE = re.compile(r"[^A-Za-z0-9._-]+")


def slugify_id(code: str, basename: str) -> str:
    stem = basename[:-5] if basename.endswith(".json") else basename
    return f"{code}-{ID_SAFE.sub('-', stem).strip('-')}"


def first_sentence(text: str, limit: int = 240) -> str:
    text = " ".join(str(text).split())
    if not text:
        return ""
    # Prefer a real sentence boundary; fall back to a hard clip on a word edge.
    m = re.search(r"(?<=[.!?])\s", text)
    if m and m.start() <= limit:
        return text[: m.start()].strip()
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0] + "…"


def tokens_from_name(basename: str) -> list[str]:
    stem = basename[:-5] if basename.endswith(".json") else basename
    stem = re.sub(r"^[A-Z]{0,3}\d{2,5}[_.-]+", "", stem)  # leading serial, e.g. 0183_, V0059.
    stem = re.sub(r"^[A-N]_", "", stem)                    # leading category letter
    parts = re.split(r"[^A-Za-z0-9]+", stem)
    out, seen = [], set()
    for p in parts:
        p = p.lower()
        if not p or p in STOPWORDS or p in seen:
            continue
        if p.isdigit() and len(p) > 2:
            continue
        seen.add(p)
        out.append(p)
    return out[:18]


def pipeline_string(stages: list[tuple[str, int]]) -> str:
    return " → ".join(f"{n}× {k}" if n > 1 else k for k, n in stages)


def build_stages(nodes: list[dict]) -> list[tuple[str, int]]:
    """Collapse the graph into a left-to-right stage string using real node x-positions."""
    ordered = sorted(
        (n for n in nodes if n.get("kind") != "sticky-note"),
        key=lambda n: ((n.get("position") or {}).get("x", 0), (n.get("position") or {}).get("y", 0)),
    )
    stages: list[list] = []
    for n in ordered:
        k = n.get("kind", "unknown")
        if stages and stages[-1][0] == k:
            stages[-1][1] += 1
        else:
            stages.append([k, 1])
    return [(k, c) for k, c in stages]


def encode_graph(nodes: list[dict], edges: list[dict], kind_ids: dict) -> dict:
    """Compact layered graph for deterministic SVG thumbnail rendering.

    Layers come from the real position.x values (already stage-ordered by the builder);
    rank inside a layer comes from position.y. Sticky notes are dropped — they are
    annotations, not pipeline stages.
    """
    live = [n for n in nodes if n.get("kind") != "sticky-note"]
    if not live:
        return {"n": [], "e": []}

    xs = sorted({(n.get("position") or {}).get("x", 0) for n in live})
    layer_of = {x: i for i, x in enumerate(xs)}

    rows = []
    idx_of_node = {}
    for n in live:
        pos = n.get("position") or {}
        idx_of_node[n["id"]] = len(rows)
        rows.append(
            {
                "i": kind_ids.setdefault(n.get("kind", "unknown"), len(kind_ids)),
                "l": layer_of[pos.get("x", 0)],
                "y": pos.get("y", 0),
            }
        )

    # Normalise y to a dense rank within each layer so the renderer needs no layout maths.
    by_layer: dict[int, list[int]] = {}
    for i, r in enumerate(rows):
        by_layer.setdefault(r["l"], []).append(i)
    for _, members in by_layer.items():
        members.sort(key=lambda i: rows[i]["y"])
        for rank, i in enumerate(members):
            rows[i]["r"] = rank
    max_rank = max((len(m) for m in by_layer.values()), default=1)

    out_nodes = [[r["i"], r["l"], r["r"]] for r in rows]
    out_edges = []
    seen = set()
    for e in edges:
        s, t = idx_of_node.get(e.get("source")), idx_of_node.get(e.get("target"))
        if s is None or t is None:
            continue
        key = (s, t)
        if key in seen:
            continue
        seen.add(key)
        out_edges.append([s, t])
    return {"n": out_nodes, "e": out_edges, "L": len(xs), "R": max_rank}


def is_blank(value) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return value.strip() == ""
    if isinstance(value, (list, tuple, dict)):
        return len(value) == 0
    return False


def extract_one(args) -> dict | None:
    path, code, basename = args
    try:
        raw = Path(path).read_bytes()
        j = json.loads(raw)
        doc = j["doc"]
        nodes = doc.get("nodes") or []
        edges = doc.get("edges") or []
    except Exception as exc:  # noqa: BLE001 - reported, never silently dropped
        return {"_error": f"{path}: {exc}"}

    kinds_seen: list[str] = []
    models: list[str] = []
    ratios: list[str] = []
    requires: list[dict] = []
    stickies: list[str] = []
    prompts: list[str] = []
    durations: list[float] = []
    resolutions: list[str] = []
    has_eval = False

    for n in nodes:
        kind = n.get("kind", "unknown")
        if kind not in kinds_seen:
            kinds_seen.append(kind)
        cfg = n.get("config") or {}

        if kind == "sticky-note":
            t = cfg.get("text")
            if t:
                stickies.append(str(t))
            continue

        m = cfg.get("model")
        if isinstance(m, str) and m and m not in models:
            models.append(m)
        # Ratio lives in `aspect_ratio` on generation nodes and in `value` on the
        # dedicated aspect-ratio-input node — both count as a ratio this file emits.
        for ar in (cfg.get("aspect_ratio"),
                   cfg.get("value") if kind == "aspect-ratio-input" else None):
            if isinstance(ar, str) and ar and ar not in ratios:
                ratios.append(ar)
        res = cfg.get("resolution")
        if isinstance(res, str) and res and res not in resolutions:
            resolutions.append(res)
        if cfg.get("enable_eval"):
            has_eval = True
        d = cfg.get("duration_seconds")
        if isinstance(d, (int, float)):
            durations.append(float(d))
        if kind == "prompt" and cfg.get("text"):
            prompts.append(str(cfg["text"]))

        if kind.endswith("-input"):
            value_key = next((k for k in ("url", "urls", "text", "value") if k in cfg), None)
            if value_key and is_blank(cfg.get(value_key)):
                requires.append(
                    {
                        "kind": kind,
                        "name": n.get("name") or kind,
                        "field": value_key,
                        "required": bool(str(n.get("name") or "").rstrip().endswith("*")),
                    }
                )

    live_nodes = [n for n in nodes if n.get("kind") != "sticky-note"]
    live_kinds = [k for k in kinds_seen if k != "sticky-note"]
    has_image = any(k in IMAGE_GEN_KINDS for k in live_kinds)
    has_video = any(k in VIDEO_GEN_KINDS for k in live_kinds)
    if has_image and has_video:
        output_type = "image+video"
    elif has_video:
        output_type = "video"
    elif has_image:
        output_type = "image"
    else:
        output_type = "image"

    stages = build_stages(nodes)
    title = TITLE_CLEAN.sub("", str(doc.get("name") or basename)).strip() or basename

    summary = ""
    for s in stickies:
        c = " ".join(s.split())
        if c.upper().startswith("STAGE 1"):
            summary = first_sentence(re.sub(r"^STAGE 1\s*[—-]\s*", "", c))
            break
    if not summary and stickies:
        summary = first_sentence(stickies[0])
    if not summary and prompts:
        summary = first_sentence(prompts[0])
    if not summary:
        summary = pipeline_string(stages)
    # Stage notes start mid-sentence once the "STAGE 1 — " prefix is stripped.
    if summary and summary[0].islower():
        summary = summary[0].upper() + summary[1:]

    kind_ids: dict[str, int] = {}
    graph = encode_graph(nodes, edges, kind_ids)
    # Remap graph kind indices to global kind names; the caller re-dictionaries them.
    inv = {v: k for k, v in kind_ids.items()}
    graph["kinds"] = [inv[i] for i in range(len(inv))]

    wid = slugify_id(code, basename)
    return {
        "id": wid,
        "category": code,
        "title": title,
        "summary": summary,
        "node_count": len(live_nodes),
        "total_nodes": len(nodes),
        "edge_count": len(edges),
        "node_kinds": live_kinds,
        "models_used": models,
        "output_type": output_type,
        "file_size_kb": round(len(raw) / 1024, 1),
        "aspect_ratios": ratios,
        "resolutions": resolutions,
        "has_eval": has_eval,
        "duration_s": round(sum(durations), 1) if durations else 0,
        "tags": tokens_from_name(basename),
        "requires_input": requires,
        "exported_at": j.get("exportedAt", ""),
        "pipeline": pipeline_string(stages),
        "stages": [[k, c] for k, c in stages],
        "graph": graph,
        "path": str(path),
        "filename": basename,
        "notes": [" ".join(s.split()) for s in stickies[:6]],
    }


def disambiguate_titles(records: list[dict]) -> int:
    """Append the distinguishing filename tokens to titles that collide.

    Roughly a third of the catalogue reuses `doc.name` across parameter variants —
    every grade of a given F reshoot shares one name, for example. The parameter that
    actually differs is always in the filename, so for each colliding group we take the
    tokens that are *not* shared by the whole group and append them. Without this, a
    browse list shows ten identical rows and the user has no way to tell them apart.
    """
    groups: dict[tuple[str, str], list[dict]] = {}
    for r in records:
        groups.setdefault((r["category"], r["title"]), []).append(r)

    renamed = 0
    for (_, title), members in groups.items():
        if len(members) < 2:
            continue
        title_tokens = set(re.split(r"[^a-z0-9]+", title.lower()))
        token_sets = [
            [t for t in r["tags"] if t not in title_tokens] for r in members
        ]
        common = set(token_sets[0])
        for ts in token_sets[1:]:
            common &= set(ts)

        for r, ts in zip(members, token_sets):
            distinct = [t for t in ts if t not in common]
            if not distinct:
                continue
            r["title"] = f"{r['title']} — {' '.join(distinct)}"
            renamed += 1
    return renamed


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--library", default=str(Path(__file__).resolve().parents[2]))
    ap.add_argument("--out", default=str(Path(__file__).resolve().parents[1] / "data"))
    ap.add_argument("--jobs", type=int, default=max(2, (os.cpu_count() or 4)))
    args = ap.parse_args()

    library = Path(args.library)
    out = Path(args.out)
    (out / "details").mkdir(parents=True, exist_ok=True)

    jobs: list[tuple[str, str, str]] = []
    for cat in CATEGORIES:
        d = library / cat["dir"]
        if not d.is_dir():
            print(f"!! missing folder: {d}", file=sys.stderr)
            continue
        for entry in sorted(os.scandir(d), key=lambda e: e.name):
            if entry.is_file() and entry.name.endswith(".json"):
                jobs.append((entry.path, cat["code"], entry.name))

    print(f"scanning {len(jobs):,} workflow files across {len(CATEGORIES)} collections…")
    t0 = time.time()

    records: list[dict] = []
    errors: list[str] = []
    with ProcessPoolExecutor(max_workers=args.jobs) as pool:
        for i, rec in enumerate(pool.map(extract_one, jobs, chunksize=200)):
            if rec is None:
                continue
            if "_error" in rec:
                errors.append(rec["_error"])
                continue
            records.append(rec)
            if (i + 1) % 5000 == 0:
                print(f"  {i + 1:,} / {len(jobs):,}  ({time.time() - t0:.0f}s)")

    print(f"parsed {len(records):,} files in {time.time() - t0:.0f}s, {len(errors)} errors")
    for e in errors[:20]:
        print("  ERROR", e, file=sys.stderr)

    # De-duplicate ids defensively (filenames are unique per the catalogue audit, but the
    # five extra collections were produced by a different run).
    seen: dict[str, int] = {}
    for r in records:
        if r["id"] in seen:
            seen[r["id"]] += 1
            r["id"] = f"{r['id']}-{seen[r['id']]}"
        else:
            seen[r["id"]] = 0

    disambiguate_titles(records)
    records.sort(key=lambda r: (r["category"], r["title"].lower()))

    # ---- dictionaries -------------------------------------------------------
    kinds = sorted({k for r in records for k in r["node_kinds"]})
    models = sorted({m for r in records for m in r["models_used"]})
    ratios = sorted({a for r in records for a in r["aspect_ratios"]})
    codes = [c["code"] for c in CATEGORIES]
    ki = {k: i for i, k in enumerate(kinds)}
    mi = {m: i for i, m in enumerate(models)}
    ri = {a: i for i, a in enumerate(ratios)}
    ci = {c: i for i, c in enumerate(codes)}
    oi = {"image": 0, "video": 1, "image+video": 2}

    rows = []
    for r in records:
        rows.append(
            [
                r["id"],
                ci[r["category"]],
                r["title"],
                r["node_count"],
                sorted(ki[k] for k in r["node_kinds"]),
                sorted(mi[m] for m in r["models_used"]),
                oi[r["output_type"]],
                r["file_size_kb"],
                sorted(ri[a] for a in r["aspect_ratios"]),
                " ".join(r["tags"]),
                r["exported_at"][:10],
                1 if r["requires_input"] else 0,
            ]
        )

    catalog = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "count": len(rows),
        "columns": [
            "id", "cat", "title", "nodes", "kinds", "models",
            "out", "kb", "ratios", "tags", "date", "needs_input",
        ],
        "dict": {"kinds": kinds, "models": models, "ratios": ratios, "cats": codes,
                 "out": ["image", "video", "image+video"]},
        "rows": rows,
    }
    (out / "catalog.json").write_text(json.dumps(catalog, separators=(",", ":")))

    # ---- detail shards ------------------------------------------------------
    shards: dict[int, dict] = {i: {} for i in range(SHARDS)}
    paths: dict[str, str] = {}
    for r in records:
        s = int(hashlib.md5(r["id"].encode()).hexdigest()[:8], 16) % SHARDS
        paths[r["id"]] = os.path.relpath(r["path"], library)
        shards[s][r["id"]] = {
            "id": r["id"],
            "cat": r["category"],
            "title": r["title"],
            "summary": r["summary"],
            "pipeline": r["pipeline"],
            "stages": r["stages"],
            "nodes": r["node_count"],
            "total_nodes": r["total_nodes"],
            "edges": r["edge_count"],
            "kinds": r["node_kinds"],
            "models": r["models_used"],
            "out": r["output_type"],
            "kb": r["file_size_kb"],
            "ratios": r["aspect_ratios"],
            "res": r["resolutions"],
            "eval": r["has_eval"],
            "dur": r["duration_s"],
            "tags": r["tags"],
            "requires": r["requires_input"],
            "exported": r["exported_at"],
            "graph": r["graph"],
            "file": r["filename"],
            "notes": r["notes"],
        }
    for i, blob in shards.items():
        (out / "details" / f"{i:02d}.json").write_text(json.dumps(blob, separators=(",", ":")))
    (out / "paths.json").write_text(json.dumps(paths, separators=(",", ":")))

    # ---- facets / stats -----------------------------------------------------
    cat_counts = Counter(r["category"] for r in records)
    out_counts = Counter(r["output_type"] for r in records)
    model_counts = Counter(m for r in records for m in r["models_used"])
    kind_counts = Counter(k for r in records for k in r["node_kinds"])
    ratio_counts = Counter(a for r in records for a in r["aspect_ratios"])

    facets = {
        "generated_at": catalog["generated_at"],
        "total": len(records),
        "total_nodes": sum(r["total_nodes"] for r in records),
        "total_edges": sum(r["edge_count"] for r in records),
        "total_kb": round(sum(r["file_size_kb"] for r in records), 1),
        "parse_errors": len(errors),
        "categories": [
            {**{k: v for k, v in c.items() if k != "dir"}, "dir": c["dir"],
             "count": cat_counts.get(c["code"], 0)}
            for c in CATEGORIES
        ],
        "output_types": dict(out_counts),
        "models": model_counts.most_common(),
        "node_kinds": kind_counts.most_common(),
        "aspect_ratios": ratio_counts.most_common(),
    }
    (out / "facets.json").write_text(json.dumps(facets, indent=1))

    cj = (out / "catalog.json").stat().st_size / 1e6
    dj = sum(f.stat().st_size for f in (out / "details").iterdir()) / 1e6
    print(f"\nwrote catalog.json ({cj:.1f} MB), {SHARDS} detail shards ({dj:.1f} MB)")
    print(f"total: {len(records):,} workflows · {facets['total_nodes']:,} nodes · "
          f"{facets['total_edges']:,} edges · {len(kinds)} node kinds · {len(models)} models")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())

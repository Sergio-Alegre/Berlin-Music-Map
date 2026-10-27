#!/usr/bin/env python3
"""Merge data/raw/*.json into data/jobs.json.

Usage:
  py scripts/merge.py            # writes data/jobs.json and data/merge-report.md
  py scripts/merge.py --dry-run  # report only

- Duplicates: same website domain, or same normalised name + postcode.
  The entity with a posted offer and the most recent check wins; on a tie, the
  one with more contact fields. Merges are listed in the report.
- Exclusions: data/exclusions.json = {"id": "reason"}; excluded entities are
  removed and logged.
- Never invents or modifies any content field.
"""
import argparse
import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "jobs.json"
REPORT = ROOT / "data" / "merge-report.md"
EXCL = ROOT / "data" / "exclusions.json"
IGNORE_HOSTS = {"dasoertliche.de", "openstreetmap.org", "miz.org", "google.com", "facebook.com", "instagram.com"}
SHARED_HOSTS = {"berlin.de", "service.berlin.de", "karriereportal-stellen.berlin.de", "dasoertliche.de", "udk-berlin.de"}
STATUS_RANK = {"posted": 2, "initiative_welcome": 1, "none_found": 0}


def norm_name(s):
    s = unicodedata.normalize("NFKD", s.lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"\b(e\.?v\.?|gmbh|ggmbh|ug|gbr|berlin|musikschule|schule|der|die|das|und)\b", " ", s)
    return re.sub(r"[^a-z0-9]+", "", s)


def domain(url):
    if not url:
        return None
    h = urlparse(url if "//" in url else "//" + url).netloc.lower()
    h = h.removeprefix("www.")
    if h in IGNORE_HOSTS:
        return None
    if h in SHARED_HOSTS:
        h = h + urlparse(url if "//" in url else "//" + url).path.rstrip("/")
    return h or None


def richness(e):
    c = e.get("contact", {})
    return sum(1 for k in ("email", "phone", "website", "application_portal", "contact_person") if c.get(k))


def score(e):
    return (STATUS_RANK[e["offer"]["status"]], e.get("last_verified", ""), richness(e))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    ents = []
    for f in sorted(RAW.glob("*.json")):
        ents.extend(json.loads(f.read_text(encoding="utf-8")))
    n_in = len(ents)

    excl = json.loads(EXCL.read_text(encoding="utf-8")) if EXCL.exists() else {}
    removed = []
    kept = []
    for e in ents:
        if e["id"] in excl:
            removed.append((e["id"], e["name"], excl[e["id"]]))
        else:
            kept.append(e)

    # duplicates
    parent = list(range(len(kept)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    by_dom, by_name = defaultdict(list), defaultdict(list)
    for i, e in enumerate(kept):
        d = domain(e.get("contact", {}).get("website"))
        if d:
            by_dom[(d, e["category"], e["address"].get("postcode", ""))].append(i)
        by_name[(norm_name(e["name"]), e["address"].get("postcode", ""))].append(i)
    for grp in list(by_dom.values()) + list(by_name.values()):
        for j in grp[1:]:
            parent[find(j)] = find(grp[0])
    groups = defaultdict(list)
    for i in range(len(kept)):
        groups[find(i)].append(i)

    merged, notes = [], []
    for idxs in groups.values():
        if len(idxs) == 1:
            merged.append(kept[idxs[0]])
            continue
        best = max(idxs, key=lambda i: score(kept[i]))
        merged.append(kept[best])
        notes.append((kept[best]["id"], [kept[i]["id"] for i in idxs if i != best]))

    merged.sort(key=lambda e: (e["district"], e["category"], e["name"]))
    ids = [e["id"] for e in merged]
    assert len(ids) == len(set(ids)), "duplicate ids"

    lines = ["# Merge report", "", f"- Input entities: {n_in}", f"- Removed by exclusion: {len(removed)}",
             f"- Duplicates merged: {sum(len(v) for _, v in notes)}", f"- Entities in jobs.json: {len(merged)}", ""]
    lines += ["## Removed", ""] + [f"- `{i}` ({n}): {r}" for i, n, r in removed] + [""]
    lines += ["## Duplicates", ""] + [f"- keeps `{k}`; absorbs {', '.join(f'`{x}`' for x in v)}" for k, v in notes] + [""]
    REPORT.write_text("\n".join(lines), encoding="utf-8")
    if not args.dry_run:
        OUT.write_text(json.dumps(merged, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"input {n_in} | removed {len(removed)} | merged {sum(len(v) for _, v in notes)} | output {len(merged)}")


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Dataset validator for Berlin Music Map (standard library only).

Usage:
  py scripts/validate.py data/raw/mitte.json --district "Mitte"
  py scripts/validate.py data/jobs.json --require-geo
  py scripts/validate.py --selftest

Applies data/schema.json (a JSON Schema subset: type, required, enum,
properties, items, minItems, minLength, maxLength, minimum, maximum, pattern,
format date/email/uri) plus cross-field rules:
  - a "posted" offer needs title and url
  - an email needs email_source_url
  - at least one contact route (email, website, phone, portal)
  - district and address are required
  - instruments is non-empty and every id exists in data/instruments.json
  - category PNO must include keyboard; category CHO must include voice
  - the point must fall inside the polygon of its district (data/geo/bezirke.geojson)
  - unique ids; categories must exist in data/categories.json
Warnings (do not fail): expired offer deadline, fields not in the schema,
contract type guessed without evidence, WND without woodwind or brass.
Exits with code 1 if there are errors.
"""
import argparse
import copy
import datetime as dt
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = ROOT / "data" / "schema.json"
BEZIRKE_PATH = ROOT / "data" / "geo" / "bezirke.geojson"
CATEGORIES_PATH = ROOT / "data" / "categories.json"
INSTRUMENTS_PATH = ROOT / "data" / "instruments.json"

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


# ---------- mini JSON Schema ----------

def _type_ok(value, t):
    if t == "string":
        return isinstance(value, str)
    if t == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if t == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if t == "boolean":
        return isinstance(value, bool)
    if t == "object":
        return isinstance(value, dict)
    if t == "array":
        return isinstance(value, list)
    if t == "null":
        return value is None
    return True


def _allows_null(schema):
    t = schema.get("type")
    return t == "null" or (isinstance(t, list) and "null" in t)


def check_schema(value, schema, path, errors, warnings):
    t = schema.get("type")
    if t is not None:
        types = t if isinstance(t, list) else [t]
        if not any(_type_ok(value, x) for x in types):
            errors.append(f"{path}: expected {'/'.join(types)}, got {type(value).__name__}")
            return
    if "enum" in schema and value not in schema["enum"]:
        errors.append(f"{path}: value {value!r} not allowed; options: {schema['enum']}")
    if isinstance(value, str):
        if "minLength" in schema and len(value) < schema["minLength"]:
            errors.append(f"{path}: text too short (minimum {schema['minLength']})")
        if "maxLength" in schema and len(value) > schema["maxLength"]:
            errors.append(f"{path}: text too long ({len(value)} > {schema['maxLength']})")
        if "pattern" in schema and not re.search(schema["pattern"], value):
            errors.append(f"{path}: {value!r} does not match pattern {schema['pattern']}")
        fmt = schema.get("format")
        if fmt == "date":
            ok = bool(DATE_RE.match(value))
            if ok:
                try:
                    dt.date.fromisoformat(value)
                except ValueError:
                    ok = False
            if not ok:
                errors.append(f"{path}: invalid date {value!r} (format YYYY-MM-DD)")
        elif fmt == "email" and not EMAIL_RE.match(value):
            errors.append(f"{path}: invalid email {value!r}")
        elif fmt == "uri" and not value.startswith(("http://", "https://")):
            errors.append(f"{path}: invalid URL {value!r}")
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            errors.append(f"{path}: {value} < minimum {schema['minimum']}")
        if "maximum" in schema and value > schema["maximum"]:
            errors.append(f"{path}: {value} > maximum {schema['maximum']}")
    if isinstance(value, dict):
        props = schema.get("properties", {})
        required = schema.get("required", [])
        for key in required:
            if key not in value or (value[key] is None and not _allows_null(props.get(key, {}))):
                errors.append(f"{path}.{key}: required")
        for key, sub in props.items():
            if key in value and value[key] is not None:
                check_schema(value[key], sub, f"{path}.{key}", errors, warnings)
        if props:
            for key in value:
                if key not in props:
                    warnings.append(f"{path}.{key}: field not in the schema")
    if isinstance(value, list):
        if "minItems" in schema and len(value) < schema["minItems"]:
            errors.append(f"{path}: at least {schema['minItems']} items required")
        if "items" in schema:
            for i, item in enumerate(value):
                check_schema(item, schema["items"], f"{path}[{i}]", errors, warnings)


# ---------- geometry ----------

def _in_ring(lng, lat, ring):
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if (yi > lat) != (yj > lat):
            x_cross = (xj - xi) * (lat - yi) / (yj - yi) + xi
            if lng < x_cross:
                inside = not inside
        j = i
    return inside


def _in_polygon(lng, lat, rings):
    if not rings or not _in_ring(lng, lat, rings[0]):
        return False
    return not any(_in_ring(lng, lat, hole) for hole in rings[1:])


def load_districts(path=BEZIRKE_PATH):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    districts = {}
    for feature in data["features"]:
        name = feature["properties"].get("name")
        geom = feature["geometry"]
        if geom["type"] == "Polygon":
            polys = [geom["coordinates"]]
        elif geom["type"] == "MultiPolygon":
            polys = geom["coordinates"]
        else:
            continue
        districts.setdefault(name, []).extend(polys)
    return districts


def district_of(lat, lng, districts):
    for name, polys in districts.items():
        if any(_in_polygon(lng, lat, rings) for rings in polys):
            return name
    return None


# ---------- cross-field rules ----------

def check_entity(entity, schema, districts, categories, instruments, opts, today):
    errors, warnings = [], []
    check_schema(entity, schema, "", errors, warnings)
    if not isinstance(entity, dict):
        return errors, warnings

    offer = entity.get("offer") or {}
    contact = entity.get("contact") or {}
    contract = entity.get("contract") or {}

    if offer.get("status") == "posted":
        for key in ("title", "url"):
            if not offer.get(key):
                errors.append(f".offer.{key}: required when status is 'posted'")
    deadline = offer.get("deadline")
    if deadline and DATE_RE.match(deadline):
        try:
            if dt.date.fromisoformat(deadline) < today:
                warnings.append(f".offer.deadline: deadline passed ({deadline}); switch to none_found if the ad is gone")
        except ValueError:
            pass

    if contact.get("email") and not contact.get("email_source_url"):
        errors.append(".contact.email_source_url: required when there is an email (page where it appears)")
    if not any(contact.get(k) for k in ("email", "website", "phone", "application_portal")):
        errors.append(".contact: at least one of email, website, phone or portal is required")

    if contract.get("type") not in (None, "unknown") and not contract.get("evidence") and not contract.get("is_guess"):
        warnings.append(".contract.evidence: missing the phrase that proves the type (or set is_guess: true)")

    if categories is not None:
        if entity.get("category") and entity["category"] not in categories:
            errors.append(f".category: {entity['category']!r} does not exist in data/categories.json")
        for sec in entity.get("secondary_categories") or []:
            if sec not in categories:
                errors.append(f".secondary_categories: {sec!r} does not exist in data/categories.json")

    inst = entity.get("instruments")
    if isinstance(inst, list):
        if not inst:
            errors.append(".instruments: must not be empty")
        if instruments is not None:
            for i in inst:
                if i not in instruments:
                    errors.append(f".instruments: {i!r} does not exist in data/instruments.json")
        if entity.get("category") == "PNO" and "keyboard" not in inst:
            errors.append(".instruments: category PNO must include 'keyboard'")
        if entity.get("category") == "CHO" and "voice" not in inst:
            errors.append(".instruments: category CHO must include 'voice'")
        if entity.get("category") == "WND" and not ({"woodwind", "brass"} & set(inst)):
            warnings.append(".instruments: category WND usually includes 'woodwind' or 'brass'")

    for key in ("district", "address"):
        if not entity.get(key):
            errors.append(f".{key}: required")
    if opts.district and entity.get("district") and entity["district"] != opts.district:
        errors.append(f".district: {entity['district']!r} is not this file's district ({opts.district!r})")
    geo = entity.get("geo")
    if opts.require_geo and not geo:
        errors.append(".geo: required (--require-geo)")
    if geo and isinstance(geo.get("lat"), (int, float)) and isinstance(geo.get("lng"), (int, float)):
        found = district_of(geo["lat"], geo["lng"], districts)
        if found is None:
            errors.append(f".geo: point ({geo['lat']}, {geo['lng']}) is outside Berlin")
        elif entity.get("district") and found != entity["district"]:
            msg = f".geo: point falls in {found}, not in {entity['district']}"
            if geo.get("precision") == "postcode":
                warnings.append(msg + " (postcode precision)")
            else:
                errors.append(msg)
    if opts.require_geo:
        for i, site in enumerate(entity.get("sites") or []):
            if isinstance(site, dict) and not site.get("geo"):
                warnings.append(f".sites[{i}] ({site.get('name', '?')}): no coordinates, so it is not on the map (add street and postcode)")
    return errors, warnings


def load_entities(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if isinstance(data, dict) and isinstance(data.get("entities"), list):
        data = data["entities"]
    if not isinstance(data, list):
        raise ValueError('the file must contain an array of entities (or {"entities": [...]})')
    return data


def _load_ids(path):
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    return {c["id"] for c in data if isinstance(c, dict) and "id" in c}


def load_categories():
    return _load_ids(CATEGORIES_PATH)


def load_instruments():
    return _load_ids(INSTRUMENTS_PATH)


def validate(entities, opts, today=None):
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    districts = load_districts()
    categories = load_categories()
    instruments = load_instruments()
    today = today or dt.date.today()
    report, seen = [], {}
    for i, entity in enumerate(entities):
        label = entity.get("id", f"#{i}") if isinstance(entity, dict) else f"#{i}"
        errors, warnings = check_entity(entity, schema, districts, categories, instruments, opts, today)
        if isinstance(entity, dict) and entity.get("id"):
            if entity["id"] in seen:
                errors.append(f".id: duplicate (also at position {seen[entity['id']]})")
            seen.setdefault(entity["id"], i)
        report.append((label, errors, warnings))
    return report


def print_report(report):
    n_err = sum(len(e) for _, e, _ in report)
    n_warn = sum(len(w) for _, _, w in report)
    for label, errors, warnings in report:
        if errors or warnings:
            print(f"\n[{label}]")
            for e in errors:
                print(f"  ERROR    {e}")
            for w in warnings:
                print(f"  warning  {w}")
    print(f"\n{len(report)} entities, {n_err} errors, {n_warn} warnings")
    return n_err


# ---------- self-test ----------

def selftest():
    class Opts:
        district = None
        require_geo = False

    good = {
        "id": "mitte-example-music-school",
        "name": "Example Music School",
        "category": "MUN",
        "district": "Mitte",
        "address": {"street": "Alexanderplatz 1", "postcode": "10178", "city": "Berlin"},
        "geo": {"lat": 52.5219, "lng": 13.4132, "precision": "address", "source": "nominatim"},
        "instruments": ["strings", "keyboard"],
        "instruments_detail": ["violin", "piano"],
        "contact": {"email": "info@example.org", "email_source_url": "https://example.org/impressum",
                    "website": "https://example.org"},
        "offer": {"status": "posted", "title": "Violin teacher (m/f/d)", "url": "https://example.org/jobs/1",
                  "deadline": "2026-11-01", "checked": "2026-10-16"},
        "contract": {"type": "employment", "evidence": "Vergütung nach TV-L"},
        "email_language": "de",
        "summary_en": "Municipal music school teaching strings and piano.",
        "sources": ["https://example.org/jobs/1"],
        "found_by": "district-scout:mitte",
        "last_verified": "2026-10-16",
    }

    def variant(**changes):
        e = copy.deepcopy(good)
        e.update(changes)
        return e

    cases = [("valid", copy.deepcopy(good), 0)]
    bad = copy.deepcopy(good); bad["offer"].pop("url"); cases.append(("posted without url", bad, 1))
    bad = copy.deepcopy(good); bad["contact"].pop("email_source_url"); cases.append(("email without source", bad, 1))
    bad = copy.deepcopy(good); bad["geo"].update(lat=52.5350, lng=13.2000); cases.append(("point in Spandau", bad, 1))
    bad = copy.deepcopy(good); bad["geo"].update(lat=52.40, lng=13.06); cases.append(("out of range", bad, 2))
    bad = copy.deepcopy(good); bad["contract"]["type"] = "honorar"; cases.append(("invalid contract type", bad, 1))
    cases.append(("no contact", variant(contact={}), 1))
    bad = copy.deepcopy(good); bad["address"]["postcode"] = "80331"; cases.append(("Munich postcode", bad, 1))
    bad = copy.deepcopy(good); bad.pop("instruments"); cases.append(("instruments missing", bad, 1))
    cases.append(("instruments empty", variant(instruments=[]), 2))
    cases.append(("unknown instrument id", variant(instruments=["strings", "kazoo"]), 2))
    cases.append(("PNO without keyboard", variant(category="PNO", instruments=["strings"]), 1))
    cases.append(("PNO with keyboard", variant(category="PNO", instruments=["keyboard"]), 0))
    cases.append(("CHO without voice", variant(category="CHO", instruments=["strings"]), 1))
    cases.append(("CHO with voice", variant(category="CHO", instruments=["voice"]), 0))
    cases.append(("unknown category", variant(category="ZZZ"), 1))

    today = dt.date(2026, 10, 16)
    ok = True
    for name, entity, expected in cases:
        (_, errors, _), = validate([entity], Opts, today=today)
        passed = len(errors) == expected
        ok &= passed
        print(f"{'OK  ' if passed else 'FAIL'} {name}: {len(errors)} errors (expected {expected})")
        if not passed:
            for e in errors:
                print("     ", e)

    # WND without woodwind or brass: warning only
    (_, errors, warnings), = validate([variant(category="WND", instruments=["strings"])], Opts, today=today)
    passed = not errors and any("WND" in w for w in warnings)
    ok &= passed
    print(f"{'OK  ' if passed else 'FAIL'} WND without woodwind/brass: warning only")
    # expired deadline: warning only
    (_, errors, warnings), = validate([good], Opts, today=dt.date(2026, 12, 1))
    passed = not errors and any("deadline" in w for w in warnings)
    ok &= passed
    print(f"{'OK  ' if passed else 'FAIL'} expired deadline: warning only")

    dup = validate([good, copy.deepcopy(good)], Opts, today=today)
    dup_ok = any("duplicate" in e for e in dup[1][1])
    ok &= dup_ok
    print(f"{'OK  ' if dup_ok else 'FAIL'} duplicate id detected")
    print("\nSelf-test passed." if ok else "\nSelf-test failed.")
    return 0 if ok else 1


def main():
    parser = argparse.ArgumentParser(description="Validate Berlin Music Map entities")
    parser.add_argument("file", nargs="?", help="JSON file with an array of entities")
    parser.add_argument("--district", help="exact district name every entity must have")
    parser.add_argument("--require-geo", action="store_true", help="require coordinates (after geocoding)")
    parser.add_argument("--selftest", action="store_true", help="run the built-in tests")
    opts = parser.parse_args()
    if opts.selftest:
        sys.exit(selftest())
    if not opts.file:
        parser.error("missing file to validate")
    try:
        entities = load_entities(opts.file)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"ERROR reading {opts.file}: {exc}")
        sys.exit(1)
    sys.exit(1 if print_report(validate(entities, opts)) else 0)


if __name__ == "__main__":
    main()

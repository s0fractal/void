#!/usr/bin/env python3
"""
Usage:
  metric-mapper.py DASHBOARD.json MAPPING.json > DASHBOARD.mapped.json

MAPPING.json may be either a single object {"from": "...", "to": "..."} or
an array of such objects.
"""
import sys, json

def load(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def apply_mapping(obj, pairs):
    s = json.dumps(obj)
    for m in pairs:
        s = s.replace(m["from"], m["to"])
    return json.loads(s)

def main():
    if len(sys.argv) < 3:
        print(__doc__, file=sys.stderr)
        sys.exit(1)
    dash = load(sys.argv[1])
    mapping = load(sys.argv[2])
    pairs = [mapping] if isinstance(mapping, dict) and "from" in mapping else mapping
    out = apply_mapping(dash, pairs)
    json.dump(out, sys.stdout, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()

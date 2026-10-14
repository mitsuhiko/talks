#!/usr/bin/env python3
"""Incident analysis for INC-2291: failed authorizations by node, acquirer, minute and merchant."""
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

logs = Path(sys.argv[1] if len(sys.argv) > 1 else "logs")
top = int(sys.argv[sys.argv.index("--top") + 1]) if "--top" in sys.argv else 0

attempts = Counter()
failed = Counter()
by_minute = Counter()
merchant_failed = defaultdict(lambda: [0, 0, ""])  # count, cents, name
first = last = None

for path in sorted(logs.glob("gw-*.jsonl")):
    print(f"scanning {path.name} ...", flush=True)
    for line in path.open():
        event = json.loads(line)
        key = (event["node"], event["acquirer"])
        attempts[key] += 1
        if event["code"] != "E_TLS_HANDSHAKE":
            continue
        failed[key] += 1
        by_minute[event["ts"][11:16]] += 1
        entry = merchant_failed[event["merchant"]]
        entry[0] += 1
        entry[1] += event["amount_cents"]
        entry[2] = event["merchant_name"]
        first = min(first or event["ts"], event["ts"])
        last = max(last or event["ts"], event["ts"])

total_attempts = sum(attempts.values())
total_failed = sum(failed.values())
print()
print(f"attempts {total_attempts}, TLS handshake failures {total_failed} ({100 * total_failed / total_attempts:.1f}%)")
print(f"window   {first} .. {last}")
for (node, acquirer), count in failed.most_common():
    print(f"         {node} -> {acquirer}: {count} of {attempts[(node, acquirer)]} attempts failed")
print(f"merchants affected {len(merchant_failed)}, "
      f"failed volume EUR {sum(v[1] for v in merchant_failed.values()) / 100:,.2f}")
if top:
    print()
    print(f"top {top} merchants by failed volume:")
    ranked = sorted(merchant_failed.items(), key=lambda item: -item[1][1])[:top]
    for merchant, (count, cents, name) in ranked:
        print(f"  {merchant}  {name:<28} {count:>5} failed  EUR {cents / 100:>10,.2f}")

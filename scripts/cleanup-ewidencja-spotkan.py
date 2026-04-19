"""Usuwa sprawy zaimportowane z pliku ewidencja_spotkan.

Req Pawel pkt 7/9: na tym etapie migrujemy TYLKO sprawy aktywne i zakonczone
(rejestr_*) + polaczenie z rozliczeniami. Sprawy "po spotkaniach" (ewidencja_spotkan)
beda wprowadzane recznie, wiec te zaimportowane automatycznie usuwamy.
"""
import os, sys, requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")
URL = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

SRC = "ewidencja_spotkan"

r = requests.get(
    f"{URL}/rest/v1/gmp_cases?select=count&import_source=eq.{SRC}",
    headers={**H, "Prefer": "count=exact", "Range": "0-0"},
)
n = r.headers.get("content-range", "0-0/0").split("/")[-1]
print(f"Spraw z import_source='{SRC}': {n}")
if n == "0":
    print("Nic do zrobienia.")
    sys.exit(0)

# Pobierz ID-y
case_ids = []
offset = 0
while True:
    r = requests.get(
        f"{URL}/rest/v1/gmp_cases?select=id&import_source=eq.{SRC}&limit=1000&offset={offset}",
        headers=H,
    )
    batch = r.json()
    if not batch:
        break
    case_ids.extend([c["id"] for c in batch])
    if len(batch) < 1000:
        break
    offset += 1000
print(f"Zebrane ID-y: {len(case_ids)}")

# Czy maja platnosci? (nie powinny wg danych)
has_pays = 0
for cid in case_ids[:10]:
    r = requests.get(f"{URL}/rest/v1/gmp_payments?select=id&case_id=eq.{cid}&limit=1", headers=H)
    if r.json():
        has_pays += 1
if has_pays:
    print(f"UWAGA: {has_pays}/10 testowanych spraw ma platnosci — przerywam.")
    sys.exit(1)

confirm = input(f"Usunac {len(case_ids)} spraw z ewidencja_spotkan? (z kaskada na aktywnosci/terminy) [tak/nie] ").strip().lower()
if confirm not in ("tak", "t", "yes", "y"):
    print("Anulowano.")
    sys.exit(0)

# Usuwamy FK-blockerow: orphan_decisions ma FK resolved_case_id (bez CASCADE)
print("Odpinam powiazane gmp_orphan_decisions (resolved_case_id -> NULL)...")
for i in range(0, len(case_ids), 50):
    batch = case_ids[i:i+50]
    ids_param = ",".join(batch)
    r = requests.patch(
        f"{URL}/rest/v1/gmp_orphan_decisions?resolved_case_id=in.({ids_param})",
        headers=H,
        json={"resolved_case_id": None},
    )
    if not r.ok and r.status_code != 404:
        print(f"  orphan_decisions batch {i}: {r.status_code} {r.text[:200]}")

# Sprawy
print("Usuwam sprawy...")
deleted = 0
for i in range(0, len(case_ids), 50):
    batch = case_ids[i:i+50]
    ids_param = ",".join(batch)
    r = requests.delete(
        f"{URL}/rest/v1/gmp_cases?id=in.({ids_param})",
        headers=H,
    )
    if not r.ok:
        print(f"  BLAD batch {i}: {r.status_code} {r.text[:300]}")
        r.raise_for_status()
    deleted += len(batch)
    if (i // 50) % 5 == 0:
        print(f"  usunieto {deleted}/{len(case_ids)}...")

print(f"\nOK: usunieto {deleted} spraw z ewidencja_spotkan")

# Smoke: ile zostalo
r = requests.get(
    f"{URL}/rest/v1/gmp_cases?select=count",
    headers={**H, "Prefer": "count=exact", "Range": "0-0"},
)
after = r.headers.get("content-range", "0-0/0").split("/")[-1]
print(f"Spraw w bazie po czyszczeniu: {after}")

"""Automatyczne przypisanie statusu aktywna/zakonczona dla spraw zaimportowanych z rozliczen.

Req Pawel pkt 8: "Czy mozliwe jest przypisanie wlasciwego statusu (aktywna/zakonczona)
automatycznie przy migracji danych?"

Logika:
- Sprawy z import_source='rozliczenia' obecnie wszystkie sa 'aktywna'.
- Reklasyfikacja na podstawie splaty (wynagrodzenie bez oplat admin):
  - total_paid >= fee_amount (z tolerancja 1 zl) -> zakonczona
  - inaczej -> pozostaw aktywna
"""
import os, sys, requests
from pathlib import Path
from dotenv import load_dotenv
from collections import defaultdict

load_dotenv(Path(__file__).parent.parent / ".env")
URL = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

SRC = "rozliczenia"
TOLERANCE = 1.0

# Sprawy ze zrodla rozliczenia
cases = []
offset = 0
while True:
    r = requests.get(
        f"{URL}/rest/v1/gmp_cases?select=id,fee_amount,status&import_source=eq.{SRC}&limit=1000&offset={offset}",
        headers=H,
    )
    batch = r.json()
    if not batch:
        break
    cases.extend(batch)
    if len(batch) < 1000:
        break
    offset += 1000
print(f"Spraw z rozliczen: {len(cases)}")

# Platnosci
all_pays = []
offset = 0
while True:
    r = requests.get(
        f"{URL}/rest/v1/gmp_payments?select=case_id,amount,kind&limit=1000&offset={offset}",
        headers=H,
    )
    batch = r.json()
    if not batch:
        break
    all_pays.extend(batch)
    if len(batch) < 1000:
        break
    offset += 1000

paid_by = defaultdict(float)
for p in all_pays:
    if p.get("kind") == "admin_fee":
        continue  # Oplaty admin. nie zaliczaja sie do wynagrodzenia
    paid_by[p["case_id"]] += float(p.get("amount") or 0)

# Kwalifikacja
to_close = []
already_closed = 0
active = 0
no_fee = 0
for c in cases:
    fee = float(c.get("fee_amount") or 0)
    if fee <= 0:
        no_fee += 1
        continue
    paid = paid_by.get(c["id"], 0.0)
    if c["status"] == "zakonczona":
        already_closed += 1
        continue
    if paid + TOLERANCE >= fee:
        to_close.append(c["id"])
    else:
        active += 1

print(f"\nPropozycja:")
print(f"  zakonczona (w pelni oplacone): {len(to_close)}")
print(f"  aktywna (czesciowo oplacone):  {active}")
print(f"  juz zakonczone:                {already_closed}")
print(f"  bez kwoty wynagrodzenia:       {no_fee}")

if not to_close:
    print("\nNic do aktualizacji.")
    sys.exit(0)

confirm = input(f"\nZaktualizowac {len(to_close)} spraw na 'zakonczona'? [tak/nie] ").strip().lower()
if confirm not in ("tak", "t", "yes", "y"):
    print("Anulowano.")
    sys.exit(0)

# Update w batchach
updated = 0
for i in range(0, len(to_close), 100):
    batch = to_close[i:i+100]
    ids_param = ",".join(batch)
    r = requests.patch(
        f"{URL}/rest/v1/gmp_cases?id=in.({ids_param})",
        headers=H,
        json={"status": "zakonczona"},
    )
    r.raise_for_status()
    updated += len(batch)
    print(f"  zaktualizowano {updated}/{len(to_close)}...")

print(f"\nOK: zaktualizowano {updated} spraw na 'zakonczona'")

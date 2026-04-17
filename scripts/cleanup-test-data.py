"""
Usuwa dane testowe z nowego projektu Supabase przed LIVE importem.
"""
import os
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

URL = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

HEADERS = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
}

# Kolejnosc: dzieci przed rodzicami (FK)
TABLES_TO_CLEAN = [
    "gmp_client_offers",
    "gmp_calendar_events",
    "gmp_lawyer_availability",
    "gmp_lawyer_blocked_dates",
    "gmp_appointments",
    "permit_leads",
    "gmp_offers",
    "gmp_lawyers",
]

def count(table):
    r = requests.get(
        f"{URL}/rest/v1/{table}?select=count",
        headers={**HEADERS, "Prefer": "count=exact", "Range": "0-0"},
    )
    r.raise_for_status()
    cr = r.headers.get("content-range", "")
    return int(cr.split("/")[-1]) if cr else 0

def delete_all(table):
    # Tabela moze miec UUID albo inne PK; uzywamy trika id=neq.<fake uuid>
    r = requests.delete(
        f"{URL}/rest/v1/{table}?id=neq.00000000-0000-0000-0000-000000000000",
        headers=HEADERS,
    )
    r.raise_for_status()

print("=== PRZED ===")
for t in TABLES_TO_CLEAN:
    c = count(t)
    print(f"  {t:30s} {c}")

print("\n=== CZYSZCZENIE ===")
for t in TABLES_TO_CLEAN:
    before = count(t)
    if before == 0:
        print(f"  {t:30s} pusta, pomijam")
        continue
    delete_all(t)
    after = count(t)
    status = "OK" if after == 0 else f"BLAD ({after} pozostalo)"
    print(f"  {t:30s} {before} -> {after} {status}")

print("\n=== PO ===")
for t in TABLES_TO_CLEAN:
    print(f"  {t:30s} {count(t)}")

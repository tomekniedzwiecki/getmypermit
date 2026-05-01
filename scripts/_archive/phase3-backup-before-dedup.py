"""Backup klientow + ich relacji przed dedupem. JSON lokalnie (gitignored)."""
import os, json, requests
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

URL = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

BACKUP = Path(__file__).parent.parent / "dane_od_pawla" / "_backup"
BACKUP.mkdir(exist_ok=True)
ts = datetime.now().strftime("%Y%m%d_%H%M%S")

def fetch_all(table, select='*'):
    out, f = [], 0
    while True:
        r = requests.get(f"{URL}/rest/v1/{table}?select={select}",
                        headers={**H, "Range-Unit": "items", "Range": f"{f}-{f+999}"})
        rows = r.json()
        out.extend(rows)
        if len(rows) < 1000: break
        f += 1000
    return out

for table in ['gmp_clients', 'gmp_cases', 'gmp_crm_appointments', 'gmp_submissions_queue', 'gmp_payments', 'gmp_payment_plans', 'gmp_invoices', 'gmp_trusted_profile_credentials']:
    data = fetch_all(table)
    path = BACKUP / f"{table}_{ts}.json"
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    print(f"  {table}: {len(data)} -> {path.name}")

print(f"\nBackup w: {BACKUP.relative_to(Path(__file__).parent.parent)}")

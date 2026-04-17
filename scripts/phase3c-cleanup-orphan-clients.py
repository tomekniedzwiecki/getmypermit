"""
Faza 3c: Usuwa klientow bez zadnej sprawy, appointmentu, submisji itp.
(Tych ktorych dedup nie dotknal bo nie mial duplikatu, ale ktorzy sa orphani.)

Uruchom --live aby wykonac.
"""
import os, sys, argparse, requests
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

URL = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

parser = argparse.ArgumentParser()
parser.add_argument("--live", action="store_true")
args = parser.parse_args()
DRY = not args.live

def fetch_all(table, select='*', extra=''):
    out, f = [], 0
    while True:
        qs = f"select={select}"
        if extra: qs += '&' + extra
        r = requests.get(f"{URL}/rest/v1/{table}?{qs}", headers={**H, "Range-Unit": "items", "Range": f"{f}-{f+999}"})
        rows = r.json()
        out.extend(rows)
        if len(rows) < 1000: break
        f += 1000
    return out

print(f"=== Faza 3c: Cleanup orphan clients ({'DRY-RUN' if DRY else 'LIVE'}) ===")

print("\n1. Pobieram klientow...")
clients = fetch_all('gmp_clients', 'id,last_name,first_name,birth_date')
print(f"   {len(clients)}")

print("\n2. Sprawdzam referencje FK...")
referenced = set()
for table, col in [
    ('gmp_cases', 'client_id'),
    ('gmp_crm_appointments', 'client_id'),
    ('gmp_submissions_queue', 'client_id'),
    ('gmp_payments', 'client_id'),
    ('gmp_payment_plans', 'client_id'),
    ('gmp_invoices', 'client_id'),
    ('gmp_trusted_profile_credentials', 'client_id'),
]:
    rows = fetch_all(table, col, f'{col}=not.is.null')
    ids = set(r[col] for r in rows if r[col])
    referenced.update(ids)
    print(f"   {table}: {len(ids)} unique client_ids")

orphans = [c for c in clients if c['id'] not in referenced]
print(f"\n3. Orphan klienci: {len(orphans)}")
print(f"   Zostanie po usunieciu: {len(clients) - len(orphans)}")

if DRY:
    print("\n   Przyklady:")
    for c in orphans[:10]:
        print(f"     {c['last_name']} {c['first_name']} dob={c['birth_date']}")
    print(f"\n   Uruchom z --live aby usunac")
    sys.exit(0)

print("\n=== LIVE: usuwam ===")
done = 0
BATCH = 100
for i in range(0, len(orphans), BATCH):
    batch = orphans[i:i+BATCH]
    ids_in = ','.join(c['id'] for c in batch)
    r = requests.delete(f"{URL}/rest/v1/gmp_clients?id=in.({ids_in})",
                       headers={**H, "Prefer": "return=minimal"})
    if r.status_code < 300:
        done += len(batch)
        print(f"   batch {i}-{i+len(batch)}: OK")
    else:
        print(f"   batch {i}: BLAD {r.status_code} {r.text[:200]}")

print(f"\nUsunieto: {done}/{len(orphans)}")
r = requests.get(f"{URL}/rest/v1/gmp_clients?select=count", headers={**H, "Prefer": "count=exact", "Range": "0-0"})
print(f"Klientow w bazie: {r.headers.get('content-range', '').split('/')[-1]}")

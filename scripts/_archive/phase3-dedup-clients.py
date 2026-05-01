"""
Faza 3: Deduplikacja klientow + re-linking appointments/submissions.

Strategia:
1. Znajdz grupy klientow z tym samym full_name_normalized
2. W kazdej grupie wybierz "canonical" - ten z data urodzenia, z emailem/telefonem, z najwiecej spraw
3. Przenies wszystkie FK (cases, appointments, submissions, payments, invoices, trusted_profile)
   z duplikatow na canonical
4. Usun duplikaty

DRY-RUN domyslnie - pokazuje co by zrobil bez zmian w bazie.
--live wykonuje zmiany.
"""
import os, sys, argparse, requests
from pathlib import Path
from dotenv import load_dotenv
from collections import defaultdict
load_dotenv(Path(__file__).parent.parent / ".env")

URL = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

parser = argparse.ArgumentParser()
parser.add_argument("--live", action="store_true")
args = parser.parse_args()
DRY = not args.live

def fetch_all(table, select='*', extra=''):
    out = []
    f = 0
    while True:
        qs = f"select={select}"
        if extra: qs += '&' + extra
        r = requests.get(f"{URL}/rest/v1/{table}?{qs}", headers={**H, "Range-Unit": "items", "Range": f"{f}-{f+999}"})
        rows = r.json()
        out.extend(rows)
        if len(rows) < 1000: break
        f += 1000
    return out

print(f"=== Faza 3: Dedup klientow ({'DRY-RUN' if DRY else 'LIVE'}) ===")
print("\n1. Pobieram klientow...")
clients = fetch_all('gmp_clients', 'id,last_name,first_name,full_name_normalized,birth_date,phone,email,nationality,employer_id,notes,created_at')
print(f"   {len(clients)}")

print("\n2. Pobieram relacje (case/appointment/submission/payment/invoice/credentials)...")
cases = fetch_all('gmp_cases', 'id,client_id')
appts = fetch_all('gmp_crm_appointments', 'id,client_id')
subs = fetch_all('gmp_submissions_queue', 'id,client_id')
pays = fetch_all('gmp_payments', 'id,client_id')
invs = fetch_all('gmp_invoices', 'id,client_id')
plans = fetch_all('gmp_payment_plans', 'id,client_id')
creds = fetch_all('gmp_trusted_profile_credentials', 'id,client_id')

case_by_client = defaultdict(list)
for c in cases:
    if c['client_id']: case_by_client[c['client_id']].append(c['id'])

print(f"   Cases: {len(cases)}, Appts: {len(appts)}, Subs: {len(subs)}, Pays: {len(pays)}, Invs: {len(invs)}, Plans: {len(plans)}, Creds: {len(creds)}")

print("\n3. Grupuje po full_name_normalized...")
by_name = defaultdict(list)
for c in clients:
    by_name[c['full_name_normalized']].append(c)

def pick_canonical(group, case_by_client):
    """Wybierz canonical: priorytet DOB > najwiecej spraw > najwiecej info."""
    def score(c):
        s = 0
        if c.get('birth_date'): s += 1000
        s += 10 * len(case_by_client.get(c['id'], []))
        if c.get('phone'): s += 5
        if c.get('email'): s += 5
        if c.get('nationality'): s += 3
        if c.get('employer_id'): s += 2
        if c.get('notes'): s += 1
        return s
    return max(group, key=score)

print("\n   Iteruje grupy...")
groups_to_merge = []
stats = {"groups_multi": 0, "will_delete": 0, "kept_canonical": 0}

for name, group in by_name.items():
    if len(group) == 1: continue
    stats["groups_multi"] += 1

    by_dob = defaultdict(list)
    for c in group:
        by_dob[c['birth_date']].append(c)

    dob_variants = [k for k in by_dob if k]
    no_dob = by_dob.get(None, []) + by_dob.get('', [])

    if len(dob_variants) == 0:
        canonical = pick_canonical(no_dob, case_by_client)
        duplicates = [c for c in no_dob if c['id'] != canonical['id']]
        if duplicates:
            groups_to_merge.append({"canonical": canonical, "duplicates": duplicates, "reason": "all_no_dob"})
    elif len(dob_variants) == 1:
        all_group = by_dob[dob_variants[0]] + no_dob
        canonical = pick_canonical(all_group, case_by_client)
        duplicates = [c for c in all_group if c['id'] != canonical['id']]
        if duplicates:
            groups_to_merge.append({"canonical": canonical, "duplicates": duplicates, "reason": "one_dob_plus_no_dob" if no_dob else "same_dob"})
    else:
        for dob in dob_variants:
            subgroup = by_dob[dob]
            if len(subgroup) > 1:
                canonical = pick_canonical(subgroup, case_by_client)
                duplicates = [c for c in subgroup if c['id'] != canonical['id']]
                groups_to_merge.append({"canonical": canonical, "duplicates": duplicates, "reason": "same_dob_multi_variants"})

total_dups = sum(len(g["duplicates"]) for g in groups_to_merge)
print(f"\n   Grup do merge: {len(groups_to_merge)}")
print(f"   Rekordow do usuniecia: {total_dups}")
print(f"   Po dedupie klientow zostanie: {len(clients) - total_dups}")

# Statystyki per reason
from collections import Counter
reasons = Counter(g["reason"] for g in groups_to_merge)
print(f"\n   Rozbicie:")
for r, n in reasons.most_common():
    print(f"     {r}: {n} grup")

if DRY:
    print(f"\n=== DRY-RUN: pokazuje top 5 duplikatow ===")
    for g in groups_to_merge[:5]:
        c = g["canonical"]
        print(f"\n   Canonical: {c['last_name']} {c['first_name']} dob={c['birth_date']} id={c['id'][:8]} cases={len(case_by_client.get(c['id'], []))}")
        for d in g["duplicates"]:
            print(f"   -> DUP:    {d['last_name']} {d['first_name']} dob={d['birth_date']} id={d['id'][:8]} cases={len(case_by_client.get(d['id'], []))}")
    print(f"\n   Aby wykonac: py scripts/phase3-dedup-clients.py --live")
    sys.exit(0)

# LIVE - merge
print(f"\n=== LIVE ===")
print(f"   Wykonanie {total_dups} merges...")

FK_TABLES = [
    ('gmp_cases', 'client_id'),
    ('gmp_crm_appointments', 'client_id'),
    ('gmp_submissions_queue', 'client_id'),
    ('gmp_payments', 'client_id'),
    ('gmp_payment_plans', 'client_id'),
    ('gmp_invoices', 'client_id'),
    ('gmp_trusted_profile_credentials', 'client_id'),
]

done = 0
for g in groups_to_merge:
    canonical_id = g["canonical"]["id"]
    for dup in g["duplicates"]:
        dup_id = dup["id"]
        # Uzupełnij canonical braki z dup (phone, email, nationality, employer)
        patch = {}
        for field in ['phone', 'email', 'nationality', 'birth_date', 'employer_id']:
            if not g["canonical"].get(field) and dup.get(field):
                patch[field] = dup[field]
                g["canonical"][field] = dup[field]  # update lokalnie zeby kolejne dup-y nie nadpisywaly
        if patch:
            requests.patch(f"{URL}/rest/v1/gmp_clients?id=eq.{canonical_id}",
                         headers={**H, "Prefer": "return=minimal"}, json=patch)

        # Przenies FK
        for table, col in FK_TABLES:
            r = requests.patch(f"{URL}/rest/v1/{table}?{col}=eq.{dup_id}",
                             headers={**H, "Prefer": "return=minimal"},
                             json={col: canonical_id})
            if r.status_code >= 400:
                print(f"     BLAD FK {table}: {r.status_code} {r.text[:200]}")

        # Usun dup
        r = requests.delete(f"{URL}/rest/v1/gmp_clients?id=eq.{dup_id}",
                          headers={**H, "Prefer": "return=minimal"})
        if r.status_code >= 400:
            print(f"     BLAD delete {dup_id}: {r.status_code} {r.text[:200]}")
        else:
            done += 1
            if done % 100 == 0:
                print(f"     {done}/{total_dups}")

print(f"\n=== DONE: usunieto {done}/{total_dups} duplikatow ===")

# Finalne liczby
r = requests.get(f"{URL}/rest/v1/gmp_clients?select=count", headers={**H, "Prefer": "count=exact", "Range": "0-0"})
print(f"Klientow w bazie: {r.headers.get('content-range', '').split('/')[-1]}")

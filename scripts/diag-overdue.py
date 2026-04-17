"""Diagnostyka zaleglosci klientow Pawla"""
import os, requests, re
from pathlib import Path
from dotenv import load_dotenv
from collections import Counter
load_dotenv(Path(__file__).parent.parent / ".env")

URL = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

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

print("=== DIAGNOSTYKA ZALEGLOSCI ===")
print("Pobieram sprawy z fee_amount > 0 i platnosci...")

cases = fetch_all('gmp_cases', 'id,case_number,fee_amount,fee_notes,extra_notes,status,category,date_accepted,date_last_activity,client_id,employer_id,assigned_to,import_raw')
payments = fetch_all('gmp_payments', 'case_id,amount,kind')

# Sum payments per case
paid_by_case = {}
for p in payments:
    if not p['case_id']: continue
    paid_by_case[p['case_id']] = paid_by_case.get(p['case_id'], 0) + float(p.get('amount') or 0)

# Pobierz klientow + staff + pracodawcow do lookup
clients = {c['id']: c for c in fetch_all('gmp_clients', 'id,last_name,first_name,phone,email,birth_date,nationality')}
staff = {s['id']: s['full_name'] for s in fetch_all('gmp_staff', 'id,full_name')}
employers = {e['id']: e for e in fetch_all('gmp_employers', 'id,name,nip')}

# Analiza
total_cases_with_fee = 0
overdue = []  # sprawa: fee - paid > 0

for c in cases:
    fee = float(c.get('fee_amount') or 0)
    if fee <= 0: continue
    total_cases_with_fee += 1
    paid = paid_by_case.get(c['id'], 0)
    diff = fee - paid
    if diff > 0:
        # Sprawa ma zalegania
        c['_fee'] = fee
        c['_paid'] = paid
        c['_remaining'] = diff
        overdue.append(c)

# Sortuj malejaco po kwocie
overdue.sort(key=lambda c: -c['_remaining'])

total_remaining = sum(c['_remaining'] for c in overdue)
print(f"\n=== PODSUMOWANIE ===")
print(f"Spraw z fee_amount > 0:           {total_cases_with_fee}")
print(f"Z nich z zaleglosciami (diff > 0): {len(overdue)}")
print(f"Laczne zaleglosci:                {total_remaining:,.0f} PLN")

# Per kategoria
by_cat = Counter()
by_cat_sum = Counter()
for c in overdue:
    cat = c.get('category') or 'none'
    by_cat[cat] += 1
    by_cat_sum[cat] += c['_remaining']

print(f"\n=== Per kategoria ===")
for cat, n in by_cat.most_common():
    print(f"  {cat:30s} {n:5d} spraw  {by_cat_sum[cat]:>12,.0f} PLN")

# Per status
by_status = Counter()
by_status_sum = Counter()
for c in overdue:
    s = c.get('status') or 'none'
    by_status[s] += 1
    by_status_sum[s] += c['_remaining']
print(f"\n=== Per status ===")
for s, n in by_status.most_common():
    print(f"  {s:20s} {n:5d} spraw  {by_status_sum[s]:>12,.0f} PLN")

# Per staff
by_staff = Counter()
by_staff_sum = Counter()
for c in overdue:
    sname = staff.get(c.get('assigned_to')) or '(nieprzypisana)'
    by_staff[sname] += 1
    by_staff_sum[sname] += c['_remaining']
print(f"\n=== Per opiekun ===")
for s, n in sorted(by_staff.items(), key=lambda x: -by_staff_sum[x[0]]):
    print(f"  {s:25s} {n:5d} spraw  {by_staff_sum[s]:>12,.0f} PLN")

# Fee_notes patterns
print(f"\n=== Patterny w fee_notes (top 20) ===")
notes_counter = Counter()
for c in overdue:
    n = (c.get('fee_notes') or '').strip()
    if n: notes_counter[n[:80]] += 1
for n, cnt in notes_counter.most_common(20):
    print(f"  {cnt:4d}x  {n}")

# Top 30 zaleglosci
print(f"\n=== TOP 30 NAJWIEKSZYCH ZALEGLOSCI ===")
for i, c in enumerate(overdue[:30], 1):
    cli = clients.get(c.get('client_id'), {})
    name = f"{cli.get('last_name', '—')} {cli.get('first_name', '')}" if cli else 'BRAK KLIENTA'
    emp = employers.get(c.get('employer_id'), {}).get('name', '')
    sname = staff.get(c.get('assigned_to'), '—')
    notes = (c.get('fee_notes') or c.get('extra_notes') or '')[:50].replace('\n', ' ')
    print(f"  {i:2d}. {name:30s} {emp[:15]:15s} | fee: {c['_fee']:>7,.0f} | paid: {c['_paid']:>7,.0f} | brak: {c['_remaining']:>7,.0f} | {sname[:15]:15s} | {notes}")

# Age analysis
from datetime import datetime, date
today = date.today()
print(f"\n=== PO CZASIE ===")
age_buckets = {'0-30 dni': 0, '30-90 dni': 0, '90-180 dni': 0, '180-365 dni': 0, '365+ dni': 0, 'brak_daty': 0}
age_sums = {k: 0 for k in age_buckets}
for c in overdue:
    d = c.get('date_last_activity') or c.get('date_accepted')
    if not d: age_buckets['brak_daty'] += 1; age_sums['brak_daty'] += c['_remaining']; continue
    try: d = datetime.fromisoformat(d).date()
    except: continue
    days = (today - d).days
    if days < 30: bucket = '0-30 dni'
    elif days < 90: bucket = '30-90 dni'
    elif days < 180: bucket = '90-180 dni'
    elif days < 365: bucket = '180-365 dni'
    else: bucket = '365+ dni'
    age_buckets[bucket] += 1
    age_sums[bucket] += c['_remaining']
for k, v in age_buckets.items():
    print(f"  {k:15s} {v:5d} spraw  {age_sums[k]:>12,.0f} PLN")

# Export CSV
csv_path = Path(__file__).parent.parent / "dane_od_pawla" / "_preview" / "zaleglosci.csv"
with csv_path.open('w', encoding='utf-8') as f:
    f.write('lp,klient,telefon,pracodawca,opiekun,data_przyjecia,kwota_naleznosc,zaplacono,zaleglosc,typ_sprawy,nr_sprawy,uwagi_finansowe\n')
    for i, c in enumerate(overdue, 1):
        cli = clients.get(c.get('client_id'), {})
        name = f"{cli.get('last_name', '—')} {cli.get('first_name', '')}" if cli else 'BRAK KLIENTA'
        phone = cli.get('phone', '') if cli else ''
        emp = employers.get(c.get('employer_id'), {}).get('name', '')
        sname = staff.get(c.get('assigned_to'), '—')
        notes = (c.get('fee_notes') or '').replace('\n', ' ').replace('"', '""')[:200]
        f.write(f'{i},"{name}","{phone}","{emp}","{sname}","{c.get("date_accepted", "")}",{c["_fee"]},{c["_paid"]},{c["_remaining"]},"{c.get("case_type", "")}","{c.get("case_number", "")}","{notes}"\n')
print(f"\n=== CSV zapisany: {csv_path.relative_to(Path(__file__).parent.parent)} ===")

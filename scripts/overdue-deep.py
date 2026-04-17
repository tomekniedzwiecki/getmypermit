"""Glebsza analiza zaleglosci - z buckets i contact availability"""
import os, requests, re
from pathlib import Path
from dotenv import load_dotenv
from collections import Counter, defaultdict
from datetime import date, datetime
load_dotenv()

URL = os.environ['SUPABASE_URL']
KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}'}

def fetch_all(table, select='*'):
    out, f = [], 0
    while True:
        r = requests.get(f"{URL}/rest/v1/{table}?select={select}", headers={**H, "Range-Unit": "items", "Range": f"{f}-{f+999}"})
        rows = r.json()
        if not isinstance(rows, list):
            print(f"ERROR on {table}: {rows}")
            break
        out.extend(rows)
        if len(rows) < 1000: break
        f += 1000
    return out

cases = fetch_all('gmp_cases', 'id,fee_amount,fee_notes,status,client_id,employer_id,date_accepted,date_last_activity,extra_notes,category')
payments = fetch_all('gmp_payments', 'case_id,amount,payment_date')
clients = {c['id']: c for c in fetch_all('gmp_clients', 'id,phone,email,last_name,first_name')}
employers = {e['id']: e for e in fetch_all('gmp_employers', 'id,name,nip,contact_email,contact_phone')}

paid_by_case = defaultdict(float)
latest_payment = {}
for p in payments:
    if not p.get('case_id'): continue
    paid_by_case[p['case_id']] += float(p.get('amount') or 0)
    d = p.get('payment_date')
    if d and d > (latest_payment.get(p['case_id']) or ''): latest_payment[p['case_id']] = d

today = date.today()
overdue = []
for c in cases:
    fee = float(c.get('fee_amount') or 0)
    if fee <= 0: continue
    paid = paid_by_case.get(c['id'], 0)
    if paid >= fee: continue
    c['_remaining'] = fee - paid
    c['_fee'] = fee
    c['_paid'] = paid
    c['_last_payment'] = latest_payment.get(c['id'])
    overdue.append(c)

# Bucket analysis
BUCKETS = [('0-30', 0, 30), ('31-60', 31, 60), ('61-90', 61, 90), ('91-180', 91, 180), ('181-365', 181, 365), ('365+', 366, 99999)]
buckets = {b[0]: {'count': 0, 'total': 0, 'with_contact': 0, 'with_contact_sum': 0} for b in BUCKETS}
buckets['brak_daty'] = {'count': 0, 'total': 0, 'with_contact': 0, 'with_contact_sum': 0}

for c in overdue:
    d = c.get('date_last_activity') or c.get('date_accepted')
    bucket_key = 'brak_daty'
    if d:
        try:
            d_obj = datetime.fromisoformat(d).date()
            days = (today - d_obj).days
            for name, lo, hi in BUCKETS:
                if lo <= days <= hi:
                    bucket_key = name
                    break
        except: pass

    cli = clients.get(c.get('client_id'), {}) or {}
    emp = employers.get(c.get('employer_id'), {}) or {}
    has_contact = bool(cli.get('phone') or cli.get('email') or emp.get('contact_phone') or emp.get('contact_email'))

    buckets[bucket_key]['count'] += 1
    buckets[bucket_key]['total'] += c['_remaining']
    if has_contact:
        buckets[bucket_key]['with_contact'] += 1
        buckets[bucket_key]['with_contact_sum'] += c['_remaining']

print('=== AGING BUCKETS (z dostepnym kontaktem) ===')
print(f'{"Bucket":15s} {"Spraw":>8s} {"Kwota":>15s} {"Z kontakt":>10s} {"Kwota k.":>15s}')
total = 0
total_contactable = 0
for k in ['0-30', '31-60', '61-90', '91-180', '181-365', '365+', 'brak_daty']:
    b = buckets[k]
    total += b['total']
    total_contactable += b['with_contact_sum']
    print(f'{k:15s} {b["count"]:>8d} {b["total"]:>12,.0f} PLN {b["with_contact"]:>10d} {b["with_contact_sum"]:>12,.0f} PLN')
print(f'{"RAZEM":15s} {sum(b["count"] for b in buckets.values()):>8d} {total:>12,.0f} PLN {"":>10s} {total_contactable:>12,.0f} PLN')

# Probability scoring (prosty)
print()
print('=== PROBABILITY SCORING (na podstawie aging) ===')
print(f'{"Bucket":15s} {"Prob %":>8s} {"Expected":>15s}')
probs = {'0-30': 0.90, '31-60': 0.75, '61-90': 0.55, '91-180': 0.35, '181-365': 0.20, '365+': 0.10, 'brak_daty': 0.30}
expected = 0
for k, b in buckets.items():
    p = probs[k]
    exp = b['total'] * p
    expected += exp
    print(f'{k:15s} {p*100:>7.0f}% {exp:>12,.0f} PLN')
print(f'{"EXPECTED":15s} {"":>8s} {expected:>12,.0f} PLN (pelne 585k x weighted prob)')

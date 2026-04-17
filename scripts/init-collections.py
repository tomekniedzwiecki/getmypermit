"""Inicjalizuje rekordy windykacji dla wszystkich zaleglych spraw z priority scoring"""
import os, requests
from pathlib import Path
from dotenv import load_dotenv
from datetime import date, datetime
load_dotenv()

URL = os.environ['SUPABASE_URL']
KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}

def fetch_all(table, select='*', extra=''):
    out, f = [], 0
    while True:
        qs = f'select={select}'
        if extra: qs += '&' + extra
        r = requests.get(f'{URL}/rest/v1/{table}?{qs}', headers={**H, 'Range-Unit': 'items', 'Range': f'{f}-{f+999}'})
        rows = r.json()
        if not isinstance(rows, list): break
        out.extend(rows)
        if len(rows) < 1000: break
        f += 1000
    return out

print('Pobieram dane...')
cases = fetch_all('gmp_cases', 'id,fee_amount,status,client_id,employer_id,date_accepted,date_last_activity,assigned_to')
payments = fetch_all('gmp_payments', 'case_id,amount')
clients_map = {c['id']: c for c in fetch_all('gmp_clients', 'id,phone,email')}
employers_map = {e['id']: e for e in fetch_all('gmp_employers', 'id,contact_email,contact_phone,nip')}

paid_by_case = {}
for p in payments:
    if not p.get('case_id'): continue
    paid_by_case[p['case_id']] = paid_by_case.get(p['case_id'], 0) + float(p.get('amount') or 0)

today = date.today()

def get_age_days(c):
    d = c.get('date_last_activity') or c.get('date_accepted')
    if not d: return None
    try: return (today - datetime.fromisoformat(d).date()).days
    except: return None

def compute_probability(age_days, has_contact, has_payments, employer_payer):
    """0-100 probability score"""
    p = 50
    if age_days is None: p = 30
    elif age_days <= 30: p = 90
    elif age_days <= 60: p = 75
    elif age_days <= 90: p = 60
    elif age_days <= 180: p = 40
    elif age_days <= 365: p = 25
    else: p = 12
    if has_contact: p += 10
    else: p -= 15
    if has_payments: p += 10  # czesciowa wplata = angazowany klient
    if employer_payer: p += 5  # firma raczej zaplaci
    return max(0, min(100, p))

def compute_priority(amount, age_days, probability):
    """Priority score - im wyzszy tym pilniejsze"""
    # Wiek: 0-30=5, 31-90=15, 91-180=25, 181-365=35, 365+=30 (365+ spada bo niska szansa)
    # Kwota: sqrt(amount/100)
    # Probability
    import math
    age_score = 30
    if age_days is None: age_score = 20
    elif age_days <= 30: age_score = 5
    elif age_days <= 90: age_score = 15
    elif age_days <= 180: age_score = 30
    elif age_days <= 365: age_score = 40
    else: age_score = 25  # bardzo stare - niska priorytet bo niska szansa
    amount_score = min(40, math.sqrt(amount) / 2)
    return int(age_score + amount_score + probability * 0.3)

def determine_initial_level(age_days):
    """Sugerowany poziom eskalacji na podstawie wieku"""
    if age_days is None: return 'new'
    if age_days <= 7: return 'new'
    if age_days <= 21: return 'reminder_soft'
    if age_days <= 45: return 'reminder_firm'
    if age_days <= 90: return 'demand_1'
    if age_days <= 180: return 'demand_final'
    if age_days <= 365: return 'pre_court'
    return 'pre_court'  # 365+ też pre_court, bo EPU ale nie automatycznie

def determine_initial_tone(age_days):
    if age_days is None: return 'neutral'
    if age_days <= 30: return 'friendly'
    if age_days <= 90: return 'neutral'
    if age_days <= 180: return 'firm'
    return 'severe'

# Znajdz zalegle
to_insert = []
skipped_existing = 0

# Sprawdz ktore sprawy juz maja collection
existing_r = fetch_all('gmp_collections', 'case_id')
existing_case_ids = set(c['case_id'] for c in existing_r)

for c in cases:
    fee = float(c.get('fee_amount') or 0)
    if fee <= 0: continue
    paid = paid_by_case.get(c['id'], 0)
    if paid >= fee: continue
    if c['id'] in existing_case_ids:
        skipped_existing += 1
        continue

    remaining = fee - paid
    age_days = get_age_days(c)

    cli = clients_map.get(c.get('client_id'), {}) or {}
    emp = employers_map.get(c.get('employer_id'), {}) or {}
    has_contact = bool(cli.get('phone') or cli.get('email') or emp.get('contact_phone') or emp.get('contact_email'))
    has_payments = paid > 0
    has_employer = bool(c.get('employer_id'))

    probability = compute_probability(age_days, has_contact, has_payments, has_employer)
    priority = compute_priority(remaining, age_days, probability)
    level = determine_initial_level(age_days)
    tone = determine_initial_tone(age_days)

    to_insert.append({
        'case_id': c['id'],
        'status': 'active',
        'level': level,
        'tone': tone,
        'assigned_to': c.get('assigned_to'),
        'total_due': remaining,
        'amount_recovered': 0,
        'probability_score': probability,
        'priority_score': priority,
        'first_due_date': c.get('date_accepted'),
        'next_action_at': today.isoformat(),  # wszystkie od razu w worklist
    })

print(f'Spraw zaleglych: {len(to_insert) + skipped_existing}')
print(f'Z juz istniejacymi collection: {skipped_existing}')
print(f'Do wstawienia: {len(to_insert)}')

# Batch insert
BATCH = 200
inserted = 0
for i in range(0, len(to_insert), BATCH):
    batch = to_insert[i:i+BATCH]
    r = requests.post(f'{URL}/rest/v1/gmp_collections', headers={**H, 'Prefer': 'return=minimal'}, json=batch)
    if r.status_code >= 400:
        print(f'  BLAD batch {i}: {r.status_code} {r.text[:300]}')
    else:
        inserted += len(batch)
        print(f'  batch {i}: OK ({len(batch)})')

print(f'\nRAZEM wstawiono: {inserted}')

# Weryfikacja
r = requests.get(f'{URL}/rest/v1/gmp_collections?select=count', headers={**H, 'Prefer': 'count=exact', 'Range': '0-0'})
cr = r.headers.get('content-range', '')
print(f'W bazie: {cr.split("/")[-1]}')

# Top 10 priority
r = requests.get(f'{URL}/rest/v1/gmp_collection_overview?select=last_name,first_name,total_due,remaining_amount,priority_score,probability_score,level,assigned_name&order=priority_score.desc&limit=10', headers=H)
print('\nTOP 10 priority:')
for c in r.json():
    print(f'  pri={c["priority_score"]:3d} prob={c["probability_score"]:3d}% | {c.get("last_name","?")} {c.get("first_name","?"):15s} | {c["remaining_amount"]:>7,.0f} PLN | {c["level"]:15s} | {c.get("assigned_name", "—")}')

"""
Faza 3b: Re-link appointments i submissions_queue bez client_id do klientow.

Dla kazdego rekordu bez client_id sprawdzamy import_raw - jesli mamy tam
nazwisko+imie (+opt. date urodzenia), szukamy w tabeli gmp_clients.

Po dedupie (Faza 3a) klienci sa teraz uniqe - wiec match powinien byc lepszy.

Uruchom PO phase3-dedup-clients.py --live.
"""
import os, requests, re, unicodedata
from pathlib import Path
from dotenv import load_dotenv
from collections import defaultdict
load_dotenv(Path(__file__).parent.parent / ".env")

URL = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

def norm(s):
    if not s: return ""
    n = unicodedata.normalize('NFD', s)
    n = ''.join(c for c in n if unicodedata.category(c) != 'Mn')
    return re.sub(r'\s+', ' ', n.lower().strip())

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

print("=== Faza 3b: Re-link appointments + submissions ===")

print("\n1. Pobieram klientow (po dedupie)...")
clients = fetch_all('gmp_clients', 'id,last_name,first_name,full_name_normalized,birth_date')
print(f"   {len(clients)}")

# Index
by_name = defaultdict(list)
by_name_dob = {}
for c in clients:
    key = c['full_name_normalized'] or norm(f"{c['last_name']} {c['first_name']}")
    by_name[key].append(c)
    if c['birth_date']:
        by_name_dob[f"{key}|{c['birth_date']}"] = c

def match_client(last_name, first_name, dob=None):
    if not last_name and not first_name: return None
    key = norm(f"{last_name} {first_name}")
    # 1. DOB match
    if dob:
        match_key = f"{key}|{dob}"
        if match_key in by_name_dob:
            return by_name_dob[match_key]
    # 2. Exact name match, but only if unique
    candidates = by_name.get(key, [])
    if len(candidates) == 1:
        return candidates[0]
    # 3. If wiele - wybierz tego z najwieksza liczba info (dob > phone > id)
    if dob:
        for c in candidates:
            if c['birth_date'] == dob:
                return c
    return None  # Ambiguous

# =========== APPOINTMENTS ===========
print("\n2. Appointments bez client_id...")
appts = fetch_all('gmp_crm_appointments', 'id,client_id,import_raw,notes', 'client_id=is.null')
print(f"   {len(appts)} do re-linku")

matched_appts = 0
for a in appts:
    raw = a.get('import_raw') or {}
    # Probuj wyciagnac klienta z roznych miejsc
    last, first, dob = None, None, None
    # Dla ODCISKI: import_raw to JSON z NAZWISKO/IMIE - ale to z dry-run, nie z rzeczywistych kolumn
    # Zamiast tego - tak naprawde zapisalem extra = {...} gdzie jest:
    # data_wpisania, dodatkowe_info, uwagi, transport
    # Plus w notes jest JSON z extras.
    # Zabezpieczenie: z notes probuje odczytac JSON
    try:
        if a.get('notes') and a['notes'].startswith('{'):
            import json
            parsed = json.loads(a['notes'])
            # Tam nie ma NAZWISKO/IMIE bezposrednio
    except:
        pass
    # Alternatywnie: uzyj import_raw jesli jest dict
    if isinstance(raw, dict):
        last = raw.get('NAZWISKO', '').strip() if raw.get('NAZWISKO') else ''
        first = raw.get('IMIĘ', '').strip() if raw.get('IMIĘ') else ''
        dob_str = raw.get('DATA URODZENIA', '')
        if dob_str and isinstance(dob_str, str) and len(dob_str) >= 10:
            dob = dob_str[:10]

    if last or first:
        match = match_client(last, first, dob)
        if match:
            r = requests.patch(f"{URL}/rest/v1/gmp_crm_appointments?id=eq.{a['id']}",
                             headers={**H, "Prefer": "return=minimal"},
                             json={'client_id': match['id']})
            if r.status_code < 300:
                matched_appts += 1
            if matched_appts % 100 == 0 and matched_appts > 0:
                print(f"     ...{matched_appts}")

print(f"   Appointments zmatchowane: {matched_appts}")

# =========== SUBMISSIONS_QUEUE ===========
print("\n3. Submissions bez client_id...")
subs = fetch_all('gmp_submissions_queue', 'id,client_id,import_raw', 'client_id=is.null')
print(f"   {len(subs)} do re-linku")

matched_subs = 0
for s in subs:
    raw = s.get('import_raw') or {}
    last, first, dob = None, None, None
    if isinstance(raw, dict):
        # WNIOSKI ELEKTRONICZNE / WROCŁAW / WAŁBRZYCH
        last = (raw.get('NAZWISKO') or raw.get('NAZWISKO ') or '').strip()
        first = (raw.get('IMIĘ') or raw.get('IMIĘ ') or '').strip()
        dob_str = raw.get('DATA URODZENIA', '')
        if dob_str and isinstance(dob_str, str) and len(dob_str) >= 10:
            dob = dob_str[:10]

    if last or first:
        match = match_client(last, first, dob)
        if match:
            r = requests.patch(f"{URL}/rest/v1/gmp_submissions_queue?id=eq.{s['id']}",
                             headers={**H, "Prefer": "return=minimal"},
                             json={'client_id': match['id']})
            if r.status_code < 300:
                matched_subs += 1

print(f"   Submissions zmatchowane: {matched_subs}")

print(f"\n=== DONE ===")
print(f"  Appointments: +{matched_appts}")
print(f"  Submissions:  +{matched_subs}")

# Final counts
r1 = requests.get(f"{URL}/rest/v1/gmp_crm_appointments?select=count&client_id=is.null", headers={**H, "Prefer": "count=exact", "Range": "0-0"})
r2 = requests.get(f"{URL}/rest/v1/gmp_submissions_queue?select=count&client_id=is.null", headers={**H, "Prefer": "count=exact", "Range": "0-0"})
print(f"\nNadal bez client_id: appointments={r1.headers.get('content-range', '').split('/')[-1]}, subs={r2.headers.get('content-range', '').split('/')[-1]}")

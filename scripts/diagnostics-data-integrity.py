"""
Pelny audyt integralnosci danych:
- Rozbicie cases per import_source (czy wszystko trafilo)
- Duplikaty klientow (ten sam last+first, rozne birth_date lub bez)
- Sprawy bez klienta / pracodawcy / opiekuna
- Orphan klienci (bez spraw)
- Orphan employers (bez spraw i bez klientow)
- Orphan payments/invoices (bez sprawy)
"""
import os, requests, unicodedata, re
from pathlib import Path
from dotenv import load_dotenv
from collections import defaultdict, Counter
load_dotenv(Path(__file__).parent.parent / ".env")

URL = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

def fetch_all(table, select='*', extra=''):
    out = []
    f = 0
    while True:
        qs = f"select={select}"
        if extra: qs += '&' + extra
        r = requests.get(f"{URL}/rest/v1/{table}?{qs}",
                        headers={**H, "Range-Unit": "items", "Range": f"{f}-{f+999}"})
        rows = r.json()
        out.extend(rows)
        if len(rows) < 1000: break
        f += 1000
    return out

def count(table, extra=''):
    qs = "select=count"
    if extra: qs += '&' + extra
    r = requests.get(f"{URL}/rest/v1/{table}?{qs}",
                    headers={**H, "Prefer": "count=exact", "Range": "0-0"})
    cr = r.headers.get("content-range", "")
    return int(cr.split("/")[-1]) if cr and "/" in cr else 0

print("=" * 70)
print("AUDYT DANYCH CRM")
print("=" * 70)

# 1. Rozbicie cases per import_source i category
print("\n1. SPRAWY per zrodlo/kategoria")
cases = fetch_all('gmp_cases', 'import_source,category,status,client_id,employer_id,assigned_to')
by_source = Counter(c['import_source'] or 'MANUAL' for c in cases)
by_cat = Counter(c['category'] or 'brak' for c in cases)
print(f"   Razem: {len(cases)}")
for src, cnt in by_source.most_common():
    print(f"   import_source={src}: {cnt}")
print()
for cat, cnt in by_cat.most_common():
    print(f"   category={cat}: {cnt}")

# 2. Sprawy bez klienta/pracodawcy/opiekuna
no_client = sum(1 for c in cases if not c['client_id'])
no_emp = sum(1 for c in cases if not c['employer_id'])
no_staff = sum(1 for c in cases if not c['assigned_to'])
print(f"\n2. SPRAWY Z BRAKAMI:")
print(f"   Bez klienta:        {no_client} ({100*no_client/len(cases):.1f}%)")
print(f"   Bez pracodawcy:     {no_emp} ({100*no_emp/len(cases):.1f}%)")
print(f"   Bez opiekuna:       {no_staff} ({100*no_staff/len(cases):.1f}%)")

# 3. Duplikaty klientow
print("\n3. KLIENCI - DUPLIKATY")
clients = fetch_all('gmp_clients', 'id,last_name,first_name,full_name_normalized,birth_date,phone')
print(f"   Razem: {len(clients)}")

# Grupuj po full_name_normalized
by_name = defaultdict(list)
for c in clients:
    by_name[c['full_name_normalized']].append(c)

dups_with_same_dob = 0
dups_dif_dob = 0
dups_some_without_dob = 0
for name, group in by_name.items():
    if len(group) == 1: continue
    dobs = [c['birth_date'] for c in group]
    if len(set(dobs)) == 1:
        # Wszyscy maja te sama date urodzenia (badz wszyscy bez) - duplikat
        dups_with_same_dob += len(group) - 1
    elif None in dobs or '' in dobs:
        # Czesc bez daty - mozliwy duplikat
        dups_some_without_dob += sum(1 for d in dobs if not d)
    else:
        # Rozne daty - rozne osoby z tym samym imieniem
        pass  # to OK

print(f"   Unikalne nazwiska+imiona: {len(by_name)}")
print(f"   Potencjalne duplikaty (to samo imie+nazwisko+data): {dups_with_same_dob}")
print(f"   Klienci bez daty urodzenia (moga byc duplikatami): {dups_some_without_dob}")

# 4. Orphan klienci
client_ids_used = set(c['client_id'] for c in cases if c['client_id'])
orphan_clients = [c for c in clients if c['id'] not in client_ids_used]
print(f"\n4. KLIENCI BEZ ZADNEJ SPRAWY: {len(orphan_clients)}")

# 5. Orphan employers
employers = fetch_all('gmp_employers', 'id,name')
emp_ids_in_cases = set(c['employer_id'] for c in cases if c['employer_id'])
emp_ids_in_clients = set(c.get('employer_id') for c in clients if c.get('employer_id'))
orphan_emps = [e for e in employers if e['id'] not in emp_ids_in_cases and e['id'] not in emp_ids_in_clients]
print(f"\n5. PRACODAWCY: {len(employers)} ogolem, {len(orphan_emps)} bez zadnej sprawy ani pracownika")

# 6. Sprawy gdzie assigned_to nie istnieje w gmp_staff (zly FK)
staff = fetch_all('gmp_staff', 'id,full_name')
staff_ids = set(s['id'] for s in staff)
broken_staff_fk = [c for c in cases if c['assigned_to'] and c['assigned_to'] not in staff_ids]
print(f"\n6. BROKEN FK assigned_to: {len(broken_staff_fk)}")

# 7. Odebrane decyzje - ile rozwiazanych vs orphan
resolved = count('gmp_orphan_decisions', 'resolved_case_id=not.is.null')
all_orph = count('gmp_orphan_decisions')
activities_decisions = count('gmp_case_activities', "activity_type=eq.decision_received")
print(f"\n7. DECYZJE:")
print(f"   Orphan decisions total:     {all_orph}")
print(f"   Rozwiazane (linkowane):     {resolved}")
print(f"   Activities decision_received: {activities_decisions}")
print(f"   Razem decyzji w historii:   {all_orph + activities_decisions - resolved}")

# 8. Platnosci orphan
payments = fetch_all('gmp_payments', 'id,case_id,amount')
no_case_pay = [p for p in payments if not p['case_id']]
print(f"\n8. PLATNOSCI: {len(payments)}, bez przypisanej sprawy: {len(no_case_pay)}")

# 9. Submissions_queue bez client_id
subs = fetch_all('gmp_submissions_queue', 'id,client_id')
no_client_sub = [s for s in subs if not s['client_id']]
print(f"\n9. SUBMISSIONS QUEUE: {len(subs)}, bez client_id: {len(no_client_sub)}")

# 10. Appointments bez client_id
appts = fetch_all('gmp_crm_appointments', 'id,client_id,case_id')
no_client_appt = [a for a in appts if not a['client_id']]
print(f"\n10. APPOINTMENTS: {len(appts)}, bez client_id: {len(no_client_appt)}")

# 11. Kontrola zgodnosci total per arkusz
print("\n11. KONTROLA vs ARKUSZE PAWLA")
print("   Spodziewane:")
print("     Ewidencja spotkan: 672 -> category=lead_ewidencja")
print("     POBYT: 1809       -> category=pobyt")
print("     POZOSTALE: 207    -> category=pozostale")
print("     REZYDENT: 157     -> category=rezydent")
print("     ZEZWOLENIA A: 598 -> category=zezwolenie_a")
print("     Smart Work: 18    -> category=smart_work")
print("     ROZLICZENIA: 1613 -> category=rozliczenie_historyczne")
print("   Suma = 5074")

print("\n   Faktycznie:")
for cat in ['lead_ewidencja', 'pobyt', 'pozostale', 'rezydent', 'zezwolenie_a', 'smart_work', 'rozliczenie_historyczne']:
    n = by_cat.get(cat, 0)
    print(f"     category={cat:28s} {n}")

print("\n=== GOTOWE ===")

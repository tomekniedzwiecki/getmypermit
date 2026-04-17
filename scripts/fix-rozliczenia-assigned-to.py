"""
Fix krytyczny: col[19] w ROZLICZENIACH to OPIEKUN SPRAWY (nie miasto jak zakladalem).
Przenosimy z import_raw.oddzial do gmp_cases.assigned_to.

PLUS: sprawdzmy czy w innych importach nie ma podobnego problemu.
"""
import os, requests, unicodedata, re
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

URL = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

def norm(s):
    if not s: return ""
    n = unicodedata.normalize('NFD', s)
    n = ''.join(c for c in n if unicodedata.category(c) != 'Mn')
    return n.upper().strip()

# Pobierz staff + ich aliasy
print("1. Pobieram staff + aliasy...")
r = requests.get(f"{URL}/rest/v1/gmp_staff?select=id,full_name,aliases", headers=H)
staff = r.json()

# Build alias -> staff_id lookup (case-insensitive, no diacritics)
alias_to_id = {}
for s in staff:
    alias_to_id[norm(s['full_name'])] = s['id']
    for a in (s.get('aliases') or []):
        alias_to_id[norm(a)] = s['id']
print(f"   {len(staff)} staff, {len(alias_to_id)} aliasow")

# Fetch all ROZLICZENIA cases
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

print("\n2. Pobieram ROZLICZENIA cases...")
rozliczenia = fetch_all('gmp_cases', 'id,assigned_to,import_raw,extra_notes', 'category=eq.rozliczenie_historyczne')
print(f"   {len(rozliczenia)}")

# Identify who is in col[19]
from collections import Counter
oddzial_values = Counter()
for c in rozliczenia:
    oddzial = (c.get('import_raw') or {}).get('oddzial')
    if oddzial:
        oddzial_values[oddzial] += 1

print(f"\n3. Unikalne wartosci 'oddzial' (col[19]):")
for v, n in oddzial_values.most_common(30):
    matched = alias_to_id.get(norm(v), None)
    status = "-> STAFF" if matched else "(miasto/inne)"
    print(f"   {n:4d}x {v[:40]:40s} {status}")

# Fix: aktualizuj assigned_to gdzie oddzial matchuje staff
print("\n4. Aktualizacja assigned_to...")
updates = []
no_match = []
for c in rozliczenia:
    oddzial = (c.get('import_raw') or {}).get('oddzial')
    if not oddzial: continue
    staff_id = alias_to_id.get(norm(oddzial))
    if staff_id and c['assigned_to'] != staff_id:
        updates.append((c['id'], staff_id, oddzial))
    elif not staff_id:
        no_match.append(oddzial)

print(f"   Do zaktualizowania: {len(updates)}")
print(f"   Bez match (miasta/inne, zostawiamy jako extra_notes): {len(no_match)}")

# Wykonaj updates
done = 0
for cid, sid, oddz in updates:
    r = requests.patch(f"{URL}/rest/v1/gmp_cases?id=eq.{cid}",
                      headers={**H, "Prefer": "return=minimal"},
                      json={'assigned_to': sid})
    if r.status_code < 300:
        done += 1
    if done % 100 == 0 and done > 0:
        print(f"   ...{done}/{len(updates)}")

print(f"\n=== DONE: zaktualizowano {done}/{len(updates)} przypisanien ===")

# Sprawdz wynik
print("\n5. Nowe liczby assigned_to per staff:")
for s in staff:
    r = requests.get(f"{URL}/rest/v1/gmp_cases?select=count&assigned_to=eq.{s['id']}",
                    headers={**H, "Prefer": "count=exact", "Range": "0-0"})
    count = r.headers.get('content-range', '').split('/')[-1]
    print(f"   {s['full_name']:25s} {count}")

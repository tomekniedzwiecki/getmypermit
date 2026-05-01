"""
Faza 2: Fuzzy match orphan_decisions -> cases.
Strategia:
1. Exact match po imie+nazwisko+data_urodzenia (powtarzamy z fazy 1 na wszelki wypadek)
2. Exact match po imie+nazwisko (bez daty urodzenia) - gdy klient ma tylko 1 sprawe
3. Levenshtein <=2 na full_name (np. "VOITOVYCH  VITALII" -> "VOITOVYCH VITALII" - podwojna spacja)
4. Dopasowanie po nazwisku samym gdy orphan nie ma imienia

Dla kazdego match:
- Aktualizujemy orphan_decisions.resolved_case_id
- Tworzymy gmp_case_activities(activity_type='decision_received')
- Data aktywnosci = date_received lub date_issued

Cel: dociagnac z 36% do ~70% matching rate.
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
    n = re.sub(r'\s+', ' ', n.lower().strip())
    return n

def lev(a, b, max_dist=3):
    """Prosty Levenshtein z early abort."""
    if abs(len(a) - len(b)) > max_dist: return max_dist + 1
    if a == b: return 0
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        curr = [i]
        for j, cb in enumerate(b, 1):
            if ca == cb:
                curr.append(prev[j-1])
            else:
                curr.append(1 + min(prev[j], curr[-1], prev[j-1]))
        if min(curr) > max_dist: return max_dist + 1
        prev = curr
    return prev[-1]

print("=== Pobieram orphan_decisions ===")
def fetch_all(table, select='*', extra_filter=''):
    all_rows = []
    from_i = 0
    PAGE = 1000
    while True:
        qs = f"select={select}"
        if extra_filter: qs += '&' + extra_filter
        r = requests.get(f"{URL}/rest/v1/{table}?{qs}",
                        headers={**H, "Range-Unit": "items", "Range": f"{from_i}-{from_i+PAGE-1}"})
        if not r.ok: raise Exception(r.text)
        rows = r.json()
        all_rows.extend(rows)
        if len(rows) < PAGE: break
        from_i += PAGE
    return all_rows

# Tylko nierozwiazane
orphans = fetch_all('gmp_orphan_decisions', '*', 'resolved_case_id=is.null')
print(f"  {len(orphans)} orphan decisions do zmatchowania")

print("\n=== Pobieram klientow + ich sprawy ===")
clients = fetch_all('gmp_clients', 'id,last_name,first_name,full_name_normalized,birth_date')
print(f"  {len(clients)} klientow")

# Index klientow po ("last first norm", "birth_iso")
by_full_norm = defaultdict(list)      # full_name_norm -> [clients]
by_lastname_norm = defaultdict(list)  # last_name_norm -> [clients]

for c in clients:
    full_norm = c.get('full_name_normalized') or norm(f"{c['last_name']} {c['first_name']}")
    c['_full_norm'] = full_norm
    c['_last_norm'] = norm(c['last_name'])
    by_full_norm[full_norm].append(c)
    by_lastname_norm[c['_last_norm']].append(c)

# Pobierz sprawy per klient
print("\n=== Pobieram sprawy z client_id ===")
cases = fetch_all('gmp_cases', 'id,client_id,date_accepted,case_number')
cases_by_client = defaultdict(list)
for case in cases:
    if case.get('client_id'):
        cases_by_client[case['client_id']].append(case)
print(f"  {len(cases)} spraw, {len(cases_by_client)} klientow z przynajmniej 1 sprawa")


print("\n=== Matching ===")
def parse_orphan_name(s):
    """Wyciagnij last+first z 'VOITOVYCH  VITALII' lub 'SLAVA TITARENKO'."""
    s = re.sub(r'\s+', ' ', s.strip())
    parts = s.split()
    if not parts: return None, None
    # Heurystyka: wiekszosc Pawla wpisuje NAZWISKO IMIE, ale czasem IMIE NAZWISKO
    # Bierzemy pierwsze jako nazwisko
    return parts[0], ' '.join(parts[1:])

stats = {
    "exact_with_dob": 0,
    "exact_no_dob_unique": 0,
    "fuzzy_name": 0,
    "fuzzy_lastname_dob": 0,
    "unmatched": 0,
    "ambiguous": 0,
}

updates = []

for o in orphans:
    full_name = o.get('raw_full_name', '')
    if not full_name:
        stats['unmatched'] += 1
        continue

    last_raw, first_raw = parse_orphan_name(full_name)
    if not last_raw:
        stats['unmatched'] += 1
        continue

    full_norm = norm(f"{last_raw} {first_raw}")
    last_norm = norm(last_raw)
    dob = o.get('raw_birth_date')

    matched = None

    # 1. Exact match po imie+nazwisko+dob (powtarzamy)
    if dob:
        for c in by_full_norm.get(full_norm, []):
            if c.get('birth_date') == dob:
                matched = c
                break
        if matched:
            stats['exact_with_dob'] += 1

    # 2. Exact full_name bez dob - tylko jesli dokladnie 1 klient z tym imieniem
    if not matched:
        candidates = by_full_norm.get(full_norm, [])
        if len(candidates) == 1:
            matched = candidates[0]
            stats['exact_no_dob_unique'] += 1
        elif len(candidates) > 1 and dob:
            # Probujmy dopasowac po dob (moze jest literowka, bierzemy najblizszego)
            for c in candidates:
                if c.get('birth_date') == dob:
                    matched = c
                    break
            if matched:
                stats['exact_with_dob'] += 1
            else:
                stats['ambiguous'] += 1

    # 3. Fuzzy na full_name (Levenshtein <= 2) - spowolnienie, tylko dla unmatched
    if not matched and len(full_norm) > 5:
        best = None
        best_dist = 3
        for norm_key, clist in by_full_norm.items():
            if len(clist) != 1: continue  # tylko unique
            d = lev(full_norm, norm_key, max_dist=2)
            if d < best_dist:
                best_dist = d
                best = clist[0]
                if d == 0: break
        if best:
            # Dodatkowo jesli dob istnieje - sprawdz czy matchuje
            if dob and best.get('birth_date') and best['birth_date'] != dob:
                pass  # skip - daty urodzenia sie nie zgadzaja
            else:
                matched = best
                stats['fuzzy_name'] += 1

    # 4. Nazwisko + dob (gdy imie nie matchuje ale nazwisko tak i data ur. tak)
    if not matched and dob:
        candidates = by_lastname_norm.get(last_norm, [])
        matching_dob = [c for c in candidates if c.get('birth_date') == dob]
        if len(matching_dob) == 1:
            matched = matching_dob[0]
            stats['fuzzy_lastname_dob'] += 1

    if matched:
        cases_for_client = cases_by_client.get(matched['id'], [])
        if not cases_for_client:
            stats['unmatched'] += 1
            continue
        # Wybierz case z date_accepted najblizsza date_received (lub pierwszy)
        target_case = cases_for_client[0]
        drec = o.get('date_received')
        if drec:
            # Najblizszy
            def score(c):
                if not c.get('date_accepted'): return 99999
                return abs((1 if c['date_accepted'] > drec else -1))
            target_case = min(cases_for_client, key=score)

        updates.append({
            'orphan_id': o['id'],
            'case_id': target_case['id'],
            'date': drec or o.get('date_issued'),
            'raw_data': {
                'full_name': full_name,
                'date_issued': o.get('date_issued'),
                'date_received': drec,
                'date_delivered': o.get('date_delivered_to_client'),
                'extra_notes': o.get('extra_notes'),
            }
        })
    else:
        stats['unmatched'] += 1

print("\n=== STATYSTYKI ===")
for k, v in stats.items():
    print(f"  {k:25s} {v}")
print(f"  RAZEM matched: {sum(stats[k] for k in ['exact_with_dob','exact_no_dob_unique','fuzzy_name','fuzzy_lastname_dob'])} / {len(orphans)}")

print(f"\n=== Wykonywanie {len(updates)} aktualizacji ===")

# Batch: UPDATE orphan_decisions + INSERT gmp_case_activities
BATCH = 200
# 1. Activities (INSERT batch)
activities = []
for u in updates:
    raw = u['raw_data']
    activities.append({
        'case_id': u['case_id'],
        'activity_type': 'decision_received',
        'content': f"Decyzja odebrana (z fazy 2 match fuzzy). Klient: {raw['full_name']}",
        'metadata': {
            'date_issued': raw['date_issued'],
            'date_received': raw['date_received'],
            'date_delivered': raw['date_delivered'],
            'matched_orphan_id': u['orphan_id'],
        },
    })

# Normalizuj klucze
all_keys = set()
for a in activities: all_keys.update(a.keys())
activities = [{k: a.get(k) for k in all_keys} for a in activities]

for i in range(0, len(activities), BATCH):
    batch = activities[i:i+BATCH]
    r = requests.post(
        f"{URL}/rest/v1/gmp_case_activities",
        headers={**H, "Prefer": "return=minimal"},
        json=batch,
        timeout=60,
    )
    if r.status_code >= 400:
        print(f"  BLAD activities batch {i}: {r.status_code} {r.text[:200]}")
    else:
        print(f"  activities batch {i} OK ({len(batch)})")

# 2. Update orphan_decisions: ustaw resolved_case_id (po jednym - PATCH bulk z filter in)
# Uzyj .in.(id1,id2,...) w grupach ale trzeba indywidualnie bo rozne case_id
# Prosciej: per-row update
print(f"\n  Aktualizuje orphan_decisions.resolved_case_id...")
done = 0
for u in updates:
    r = requests.patch(
        f"{URL}/rest/v1/gmp_orphan_decisions?id=eq.{u['orphan_id']}",
        headers={**H, "Prefer": "return=minimal"},
        json={"resolved_case_id": u['case_id']},
    )
    if r.status_code < 300:
        done += 1
    if done % 100 == 0:
        print(f"    {done}/{len(updates)}")
print(f"  OK: {done}/{len(updates)}")

print(f"\n=== DONE ===")
print(f"Dodatkowo zmatchowanych: {done}")
print(f"Nadal unmatched: {stats['unmatched']}")
print(f"Ambiguous: {stats['ambiguous']}")

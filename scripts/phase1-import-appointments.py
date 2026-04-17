"""
Migracja tabeli gmp_crm_appointments + import appointments z dry-run.
Wybieramy dane z _dry_run/appointments.json (840 rekordow: 672 konsultacje z Ewidencji + 168 odciski)
"""
import os, json, psycopg, requests
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

URL = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
REF = os.environ["SUPABASE_PROJECT_REF"]
PWD = os.environ["SUPABASE_DB_PASSWORD"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

print("=== 1. Migracja schema ===")
conn = psycopg.connect(host="aws-0-eu-west-1.pooler.supabase.com", port=5432,
                      user=f"postgres.{REF}", password=PWD, dbname="postgres", sslmode="require")
sql = (Path(__file__).parent.parent / "supabase" / "migrations" / "20260417_crm_appointments.sql").read_text(encoding="utf-8")
with conn.cursor() as cur:
    cur.execute(sql)
    conn.commit()
print("  OK")

print("\n=== 2. Import 840 appointments z _dry_run ===")
DRY = Path(__file__).parent.parent / "dane_od_pawla" / "_preview" / "_dry_run" / "appointments.json"
appts = json.loads(DRY.read_text(encoding="utf-8"))
print(f"  Plan: {len(appts)}")

# Pobierz mapy do linkow FK
print("  Pobieram mapy client_key -> id, cases (by idx), staff by name...")
r = requests.get(f"{URL}/rest/v1/gmp_clients?select=id,full_name_normalized,birth_date", headers={**H, "Range": "0-9999"})
clients = r.json()
client_by_key = {}
for c in clients:
    if c['birth_date']:
        client_by_key[f"WITH_DOB|{c['full_name_normalized']}|{c['birth_date']}"] = c['id']
    # NO_DOB clients nie maja stabilnego key

# Staff
r = requests.get(f"{URL}/rest/v1/gmp_staff?select=id,full_name", headers=H)
staff_by_name = {s['full_name']: s['id'] for s in r.json()}

# Cases - po import_source + import_source_row (zeby zmatchowac case_idx)
# Kazde appointment ma _link_case_idx ktory wskazuje pozycje w cases list z dry-run
# Ale cases w bazie maja import_source + import_source_row ktore pozwalaja nam odtworzyc
# Prosciej: pobieramy cases w takim samym order jak byly inserted
# (w skrypcie import byly inserted w kolejnosci list: cases w order as generated)
# Ale bez wiedzy o oryginalnej kolejnosci nie zmatchujemy _link_case_idx.
# Akcceptujemy: jesli _link_case_idx, bierzemy cases gdzie import_source=ewidencja_spotkan
# i ten wiersz ma client_key == appointment.client_key.
# Prosciej: pomijamy _link_case_idx (nie jest krytyczne) i linkujemy po client_id.

r = requests.get(f"{URL}/rest/v1/gmp_cases?select=id,client_id,import_source,date_accepted&import_source=eq.ewidencja_spotkan&limit=10000", headers={**H, "Range": "0-9999"})
cases_ewid = r.json()
# Slownik: client_id -> [case_id] (moze byc 1..n spraw z ewidencji per klient)
cases_by_client = {}
for c in cases_ewid:
    if c['client_id']:
        cases_by_client.setdefault(c['client_id'], []).append((c['id'], c['date_accepted']))

matched_count = 0
to_insert = []

for a in appts:
    row = {
        "appointment_type": a.get("appointment_type", "konsultacja"),
        "scheduled_date": a.get("scheduled_date"),
        "transport_type": a.get("transport_type"),
        "import_source": a.get("import_source"),
    }
    # Client
    ck = a.get("client_key")
    client_id = None
    if ck and isinstance(ck, list) and len(ck) >= 3 and ck[0] == "WITH_DOB":
        key = f"WITH_DOB|{ck[1]}|{ck[2]}"
        client_id = client_by_key.get(key)
    if client_id:
        row["client_id"] = client_id
        matched_count += 1
        # Znajdz case_id po dacie jesli mozna
        cases_list = cases_by_client.get(client_id, [])
        if cases_list:
            # Wez case z date_accepted najblizsza scheduled_date (jesli istnieje)
            scheduled = a.get("scheduled_date")
            if scheduled and cases_list[0][1]:
                # Najblizszy
                best = min(cases_list, key=lambda c: abs((c[1] or '9999') != (scheduled or '9999')))
                row["case_id"] = best[0]
            else:
                row["case_id"] = cases_list[0][0]

    # Staff
    sn = a.get("staff_name")
    if sn and sn in staff_by_name:
        row["staff_id"] = staff_by_name[sn]

    # Extra info (z ODCISKI)
    extra = a.get("extra") or {}
    if extra:
        row["notes"] = json.dumps({k: v for k, v in extra.items() if v}, ensure_ascii=False)
        row["import_raw"] = extra

    # Konsultacje maja title
    if row["appointment_type"] == "konsultacja":
        row["title"] = "Konsultacja (z Ewidencji spotkań)"
    elif row["appointment_type"] == "osobiste_odciski":
        row["title"] = "Osobiste stawiennictwo - odciski"

    to_insert.append(row)

# Normalizuj klucze (Supabase REST quirk)
all_keys = set()
for r in to_insert: all_keys.update(r.keys())
to_insert = [{k: r.get(k) for k in all_keys} for r in to_insert]

print(f"  Matched klient w {matched_count}/{len(to_insert)} rekordach")

# Batch POST
inserted = 0
BATCH = 300
for i in range(0, len(to_insert), BATCH):
    batch = to_insert[i:i+BATCH]
    r = requests.post(
        f"{URL}/rest/v1/gmp_crm_appointments",
        headers={**H, "Prefer": "return=minimal"},
        json=batch,
        timeout=60,
    )
    if r.status_code >= 400:
        print(f"    BLAD batch {i}: {r.status_code} {r.text[:300]}")
    else:
        inserted += len(batch)
        print(f"    batch {i} OK ({len(batch)})")

print(f"\n=== Finalnie: {inserted} / {len(to_insert)} ===")
r = requests.get(f"{URL}/rest/v1/gmp_crm_appointments?select=count", headers={**H, "Prefer": "count=exact", "Range": "0-0"})
print(f"W bazie: {r.headers.get('content-range', '').split('/')[-1]}")

conn.close()

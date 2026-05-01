"""
1. Dokoncz import submissions_queue (500->843)
2. Dodaj storage policies dla authenticated do bucketa 'documents'
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

print("=== 1. Storage policies dla authenticated ===")
conn = psycopg.connect(host="aws-0-eu-west-1.pooler.supabase.com", port=5432,
                      user=f"postgres.{REF}", password=PWD, dbname="postgres", sslmode="require")
with conn.cursor() as cur:
    cur.execute("""
        DROP POLICY IF EXISTS "auth_read_documents" ON storage.objects;
        DROP POLICY IF EXISTS "auth_write_documents" ON storage.objects;
        DROP POLICY IF EXISTS "auth_update_documents" ON storage.objects;
        DROP POLICY IF EXISTS "auth_delete_documents" ON storage.objects;
        CREATE POLICY "auth_read_documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='documents');
        CREATE POLICY "auth_write_documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='documents');
        CREATE POLICY "auth_update_documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='documents');
        CREATE POLICY "auth_delete_documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='documents');
    """)
    conn.commit()
    print("  OK storage policies")

print("\n=== 2. Dokoncz import submissions_queue (brakuje ~343) ===")
# Przeczytaj DRY-RUN i porownaj z tym co jest w bazie
DRY = Path(__file__).parent.parent / "dane_od_pawla" / "_preview" / "_dry_run" / "submissions_queue.json"
all_subs = json.loads(DRY.read_text(encoding="utf-8"))
print(f"  Plan: {len(all_subs)} rekordow")

r = requests.get(f"{URL}/rest/v1/gmp_submissions_queue?select=count", headers={**H, "Prefer": "count=exact", "Range": "0-0"})
in_db = int(r.headers.get("content-range", "0-0/0").split("/")[-1])
print(f"  W bazie: {in_db}")
missing = len(all_subs) - in_db
if missing <= 0:
    print("  Nic do dodania")
else:
    # Dodajemy od pozycji in_db do end (bo kolejnosc z DRY-RUN = kolejnosc insertu)
    # Ale musimy tez zmapowac client_id i office_id z dry-run keys -> real UUIDs
    print(f"  Dodajemy ostatnie {missing} rekordow")

    # Mapping: office_code -> id
    r = requests.get(f"{URL}/rest/v1/gmp_offices?select=id,code", headers=H)
    office_map = {o['code']: o['id'] for o in r.json()}

    # Mapping: client_key -> client_id (trudne, bo DRY zawiera ("WITH_DOB", name_norm, dob))
    # Pobierzmy klientow z bazy po full_name_normalized + birth_date
    r = requests.get(f"{URL}/rest/v1/gmp_clients?select=id,full_name_normalized,birth_date&limit=10000", headers={**H, "Range": "0-9999"})
    clients_in_db = r.json()
    client_by_key = {}
    for c in clients_in_db:
        if c['birth_date']:
            client_by_key[f"WITH_DOB|{c['full_name_normalized']}|{c['birth_date']}"] = c['id']

    # Kontynuuj od in_db
    to_insert = []
    for s in all_subs[in_db:]:
        row = {
            "status": s.get("status", "pending"),
            "mos_number": s.get("mos_number"),
            "pio_number": s.get("pio_number"),
            "ticket_number": s.get("ticket_number"),
            "date_notification_sent": s.get("date_notification_sent"),
            "scheduled_at": s.get("scheduled_at"),
            "transport_type": s.get("transport_type"),
            "notes": s.get("notes"),
            "import_source": s.get("import_source"),
            "import_raw": s.get("import_raw"),
        }
        # Client mapping - uproszczenie: jesli NO_DOB to skip client_id, bo nie da sie zmatchowac
        ck = s.get("client_key")
        if ck and isinstance(ck, list) and len(ck) >= 3:
            if ck[0] == "WITH_DOB":
                key = f"WITH_DOB|{ck[1]}|{ck[2]}"
                if key in client_by_key:
                    row["client_id"] = client_by_key[key]
        oc = s.get("office_code")
        if oc and oc in office_map:
            row["office_id"] = office_map[oc]
        to_insert.append(row)

    # Normalizuj klucze
    all_keys = set()
    for r2 in to_insert: all_keys.update(r2.keys())
    to_insert = [{k: r2.get(k) for k in all_keys} for r2 in to_insert]

    # Batch insert
    BATCH = 200
    for i in range(0, len(to_insert), BATCH):
        batch = to_insert[i:i+BATCH]
        r = requests.post(f"{URL}/rest/v1/gmp_submissions_queue", headers={**H, "Prefer": "return=minimal"}, json=batch)
        if r.status_code >= 400:
            print(f"    BLAD batch {i}: {r.status_code} {r.text[:200]}")
        else:
            print(f"    batch {i} OK")

    # Sprawdz finalne
    r = requests.get(f"{URL}/rest/v1/gmp_submissions_queue?select=count", headers={**H, "Prefer": "count=exact", "Range": "0-0"})
    final = int(r.headers.get("content-range", "0-0/0").split("/")[-1])
    print(f"  Finalnie: {final}")

conn.close()
print("\nDONE")

"""Aplikuje migracje 20260419_party_type_and_pesel.sql.

Req Pawel pkt 10-12:
- party_type (individual/employer/other) na gmp_cases
- PESEL na gmp_clients
- deadline_response / deadline_hearing na gmp_cases
- gmp_employer_case_workers (wielu pracownikow w sprawie pracodawcy)
"""
import os, psycopg
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

REF = os.environ["SUPABASE_PROJECT_REF"]
PWD = os.environ["SUPABASE_DB_PASSWORD"]

sql_path = Path(__file__).parent.parent / "supabase" / "migrations" / "20260419_party_type_and_pesel.sql"
sql = sql_path.read_text(encoding="utf-8")

print(f"Applying: {sql_path.name}")
conn = psycopg.connect(host="aws-0-eu-west-1.pooler.supabase.com", port=5432,
                      user=f"postgres.{REF}", password=PWD, dbname="postgres", sslmode="require")
try:
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
    print("OK migracja")

    with conn.cursor() as cur:
        cur.execute("""
            SELECT party_type, COUNT(*) FROM gmp_cases GROUP BY party_type ORDER BY party_type
        """)
        print("Spraw per party_type:")
        for r in cur.fetchall():
            print(f"  {r[0]}: {r[1]}")

        cur.execute("SELECT COUNT(*) FROM information_schema.columns WHERE table_name='gmp_clients' AND column_name='pesel'")
        print(f"Kolumna gmp_clients.pesel: {'OK' if cur.fetchone()[0] else 'BRAK'}")

        cur.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_name='gmp_employer_case_workers'")
        print(f"Tabela gmp_employer_case_workers: {'OK' if cur.fetchone()[0] else 'BRAK'}")
finally:
    conn.close()

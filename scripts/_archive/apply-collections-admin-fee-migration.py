"""Aplikuje migracje 20260419_collections_exclude_admin_fee.sql.

Req Pawel pkt 3/6: widok gmp_collection_overview ma wykluczac platnosci
kind='admin_fee' przy obliczaniu remaining_amount - oplaty administracyjne
sa odrebna kategoria, nie redukuja dlugu wzgledem wynagrodzenia.
"""
import os, psycopg
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

REF = os.environ["SUPABASE_PROJECT_REF"]
PWD = os.environ["SUPABASE_DB_PASSWORD"]

sql_path = Path(__file__).parent.parent / "supabase" / "migrations" / "20260419_collections_exclude_admin_fee.sql"
sql = sql_path.read_text(encoding="utf-8")

print(f"Applying: {sql_path.name}")
conn = psycopg.connect(host="aws-0-eu-west-1.pooler.supabase.com", port=5432,
                      user=f"postgres.{REF}", password=PWD, dbname="postgres", sslmode="require")
try:
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
    print("OK migracja")

    # Smoke: policz case-y gdzie admin_fee wplywal na remaining_amount
    with conn.cursor() as cur:
        cur.execute("""
            SELECT COUNT(DISTINCT case_id) FROM gmp_payments
            WHERE kind = 'admin_fee'
              AND case_id IN (SELECT case_id FROM gmp_collections)
        """)
        affected = cur.fetchone()[0]
        print(f"Spraw w windykacji z platnosciami admin_fee: {affected}")
finally:
    conn.close()

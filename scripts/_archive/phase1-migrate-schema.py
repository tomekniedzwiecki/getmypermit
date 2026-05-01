"""
Uruchamia migracje schema CRM na nowym Supabase.
"""
import os
import psycopg
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

MIGRATION_FILE = Path(__file__).parent.parent / "supabase" / "migrations" / "20260417_crm_core_schema.sql"

ref = os.environ["SUPABASE_PROJECT_REF"]
pwd = os.environ["SUPABASE_DB_PASSWORD"]

# Haslo moze zawierac $ @ / itp. - uzywamy parametrow zamiast URL
conn_kwargs = dict(
    host="aws-0-eu-west-1.pooler.supabase.com",
    port=5432,
    user=f"postgres.{ref}",
    password=pwd,
    dbname="postgres",
    sslmode="require",
    connect_timeout=10,
)

print("Laczenie z Supabase...")
with psycopg.connect(**conn_kwargs) as conn:
    print("OK polaczone")
    sql = MIGRATION_FILE.read_text(encoding="utf-8")
    print(f"Uruchamiam migracje: {MIGRATION_FILE.name} ({len(sql)} znakow)")
    with conn.cursor() as cur:
        try:
            cur.execute(sql)
            conn.commit()
            print("OK migracja wykonana")
        except Exception as e:
            conn.rollback()
            print(f"BLAD: {type(e).__name__}: {e}")
            raise

    # Weryfikacja - listuj nowe tabele CRM
    with conn.cursor() as cur:
        cur.execute("""
            SELECT tablename FROM pg_tables
            WHERE schemaname='public'
              AND tablename LIKE 'gmp_%'
            ORDER BY tablename
        """)
        rows = cur.fetchall()
        print("\n=== Tabele gmp_* w nowym projekcie ===")
        for r in rows:
            print(f"  - {r[0]}")

"""
Aplikuje migrację 20260429_partial_leads.sql
- Dodaje is_partial, form_session_id, last_step_reached do permit_leads
- Tworzy unique index na form_session_id (partial gdy NOT NULL)
- Aktualizuje widok gmp_leads_overview
"""
import os, psycopg
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

REF = os.environ["SUPABASE_PROJECT_REF"]
PWD = os.environ["SUPABASE_DB_PASSWORD"]

sql_path = Path(__file__).parent.parent / "supabase" / "migrations" / "20260429_partial_leads.sql"
sql = sql_path.read_text(encoding="utf-8")

print(f"Applying: {sql_path.name}")
conn = psycopg.connect(host="aws-0-eu-west-1.pooler.supabase.com", port=5432,
                      user=f"postgres.{REF}", password=PWD, dbname="postgres", sslmode="require")
try:
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
    print("OK")

    with conn.cursor() as cur:
        cur.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name='permit_leads' AND column_name IN ('is_partial','form_session_id','last_step_reached')
            ORDER BY column_name
        """)
        for row in cur.fetchall():
            print(f"  col {row[0]}: {row[1]} default={row[2]}")

        cur.execute("SELECT indexname FROM pg_indexes WHERE tablename='permit_leads' AND indexname IN ('uq_permit_leads_form_session_id','idx_permit_leads_is_partial')")
        idx = [r[0] for r in cur.fetchall()]
        print(f"  indexes: {idx}")

        cur.execute("SELECT 1 FROM information_schema.views WHERE table_name='gmp_leads_overview'")
        print(f"  view gmp_leads_overview: {'EXISTS' if cur.fetchone() else 'MISSING'}")
finally:
    conn.close()

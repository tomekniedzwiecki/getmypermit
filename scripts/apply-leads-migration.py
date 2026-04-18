"""
Aplikuje migrację 20260418_leads_crm_integration.sql
"""
import os, psycopg
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

REF = os.environ["SUPABASE_PROJECT_REF"]
PWD = os.environ["SUPABASE_DB_PASSWORD"]

sql_path = Path(__file__).parent.parent / "supabase" / "migrations" / "20260418_leads_crm_integration.sql"
sql = sql_path.read_text(encoding="utf-8")

print(f"Applying: {sql_path.name}")
conn = psycopg.connect(host="aws-0-eu-west-1.pooler.supabase.com", port=5432,
                      user=f"postgres.{REF}", password=PWD, dbname="postgres", sslmode="require")
try:
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
    print("OK")

    # Smoke tests
    with conn.cursor() as cur:
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='permit_leads' AND column_name IN ('assigned_to','converted_case_id','qualification_checklist','disqualification_reason','first_name','last_name') ORDER BY column_name")
        cols = [r[0] for r in cur.fetchall()]
        print(f"New columns: {cols}")

        cur.execute("SELECT table_name FROM information_schema.views WHERE table_name='gmp_leads_overview'")
        print(f"View gmp_leads_overview: {'EXISTS' if cur.fetchone() else 'MISSING'}")

        cur.execute("SELECT routine_name FROM information_schema.routines WHERE routine_name='gmp_convert_lead_to_case'")
        print(f"Function gmp_convert_lead_to_case: {'EXISTS' if cur.fetchone() else 'MISSING'}")
finally:
    conn.close()

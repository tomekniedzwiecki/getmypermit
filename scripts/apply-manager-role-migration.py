"""Aplikuje migracje 20260419_manager_role.sql - dodaje role 'manager' (req Pawel pkt 5)."""
import os, psycopg
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

REF = os.environ["SUPABASE_PROJECT_REF"]
PWD = os.environ["SUPABASE_DB_PASSWORD"]

sql_path = Path(__file__).parent.parent / "supabase" / "migrations" / "20260419_manager_role.sql"
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
        cur.execute("SELECT role, COUNT(*) FROM gmp_staff GROUP BY role ORDER BY role")
        print("Staff per role:")
        for r in cur.fetchall():
            print(f"  {r[0]}: {r[1]}")
finally:
    conn.close()

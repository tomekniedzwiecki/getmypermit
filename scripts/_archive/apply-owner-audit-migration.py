"""Aplikuje migrację 20260418_owner_role_and_audit.sql + awansuje 2 konta do roli 'owner'"""
import os, psycopg
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

REF = os.environ["SUPABASE_PROJECT_REF"]
PWD = os.environ["SUPABASE_DB_PASSWORD"]

sql_path = Path(__file__).parent.parent / "supabase" / "migrations" / "20260418_owner_role_and_audit.sql"
sql = sql_path.read_text(encoding="utf-8")

OWNER_EMAILS = ["p.stachurski@adwokaci-sg.pl", "tomekniedzwiecki@gmail.com"]

print(f"Applying: {sql_path.name}")
conn = psycopg.connect(host="aws-0-eu-west-1.pooler.supabase.com", port=5432,
                      user=f"postgres.{REF}", password=PWD, dbname="postgres", sslmode="require")
try:
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
    print("OK migracja")

    # Awans 2 kont do owner
    with conn.cursor() as cur:
        for email in OWNER_EMAILS:
            cur.execute("UPDATE gmp_staff SET role='owner' WHERE LOWER(email)=LOWER(%s) RETURNING id, email, full_name", (email,))
            r = cur.fetchone()
            print(f"  owner: {email} -> {r if r else 'NOT FOUND'}")
    conn.commit()

    # Smoke tests
    with conn.cursor() as cur:
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='gmp_staff' AND column_name IN ('last_login_at','login_count') ORDER BY column_name")
        cols = [r[0] for r in cur.fetchall()]
        print(f"staff new cols: {cols}")

        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_name='gmp_audit_log'")
        print(f"table gmp_audit_log: {'EXISTS' if cur.fetchone() else 'MISSING'}")

        cur.execute("SELECT table_name FROM information_schema.views WHERE table_name='gmp_live_activity'")
        print(f"view gmp_live_activity: {'EXISTS' if cur.fetchone() else 'MISSING'}")

        cur.execute("SELECT role, COUNT(*) FROM gmp_staff GROUP BY role ORDER BY role")
        print("staff per role:")
        for r in cur.fetchall():
            print(f"  {r[0]}: {r[1]}")
finally:
    conn.close()

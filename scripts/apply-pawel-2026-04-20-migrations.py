"""
Aplikuje migracje z uwag Pawła z 2026-04-20:
- 20260420_pawel_slowniki_v2.sql
- 20260420_pawel_finanse_v2.sql
- 20260420_pawel_case_fields_v2.sql
- 20260421_pawel_multi_assignees.sql
- 20260421_pawel_tasks_visibility.sql
- 20260422_pawel_staff_stats_and_alerts.sql

I oznacza je jako applied w schema_migrations (zeby supabase CLI tez wiedzial).
"""
import os, sys, psycopg
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

REF = os.environ["SUPABASE_PROJECT_REF"]
PWD = os.environ["SUPABASE_DB_PASSWORD"]

MIGRATIONS = [
    "20260420_pawel_slowniki_v2.sql",
    "20260420_pawel_finanse_enums.sql",
    "20260420_pawel_finanse_v2.sql",
    "20260420_pawel_case_fields_v2.sql",
    "20260421_pawel_multi_assignees.sql",
    "20260421_pawel_tasks_visibility.sql",
    "20260422_pawel_staff_stats_and_alerts.sql",
    "20260422_pawel_pg_cron_installments.sql",
    "20260423_pawel_intake_docs_approval.sql",
    "20260423_pawel_fixes_from_audit.sql",
    "20260423_pawel_hardening.sql",
]

# Force skip (juz zaaplikowane na bazie — skipujemy idempotentnie)
# PowodL schema_migrations ma PK tylko na version, nie version+name, wiec nie mozemy zapisac wielu w tej samej dacie
FORCE_SKIP = {
    "20260420_pawel_finanse_enums.sql",
    "20260420_pawel_finanse_v2.sql",
    "20260420_pawel_case_fields_v2.sql",
    "20260421_pawel_tasks_visibility.sql",
    "20260422_pawel_pg_cron_installments.sql",
}

migrations_dir = Path(__file__).parent.parent / "supabase" / "migrations"

conn = psycopg.connect(
    host="aws-0-eu-west-1.pooler.supabase.com",
    port=5432,
    user=f"postgres.{REF}",
    password=PWD,
    dbname="postgres",
    sslmode="require",
)
conn.autocommit = False

try:
    for fname in MIGRATIONS:
        if fname in FORCE_SKIP:
            print(f"SKIP (force): {fname}")
            continue
        path = migrations_dir / fname
        sql = path.read_text(encoding="utf-8")
        version = fname.split("_")[0]
        name = fname.replace(".sql", "").replace(version + "_", "")

        # Sprawdz czy juz nie zaapilkowana (po name, bo version sie powtarza dla tej samej daty)
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = %s AND name = %s LIMIT 1",
                (version, name),
            )
            if cur.fetchone():
                print(f"SKIP (already applied): {fname}")
                continue

        print(f"Applying: {fname} ({len(sql)} bytes)")
        try:
            with conn.cursor() as cur:
                cur.execute(sql)
            # Zapisz do schema_migrations zeby CLI to widzial
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO supabase_migrations.schema_migrations (version, name, statements) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                    (version, name, [sql]),
                )
            conn.commit()
            print(f"  OK")
        except Exception as e:
            conn.rollback()
            print(f"  ERROR: {e}")
            sys.exit(1)

    print("\n=== VERIFICATION ===")
    with conn.cursor() as cur:
        # Nowe pola na gmp_cases
        cur.execute(
            """SELECT column_name FROM information_schema.columns
               WHERE table_name = 'gmp_cases'
                 AND column_name IN ('admin_fee_amount','stamp_fee_amount','client_advances_amount','legal_stay_end_date','document_location','accepted_by','assigned_at')
               ORDER BY column_name"""
        )
        print("Nowe kolumny w gmp_cases:")
        for r in cur.fetchall():
            print(f"  [OK] {r[0]}")

        # Nowe tabele
        cur.execute(
            """SELECT table_name FROM information_schema.tables
               WHERE table_schema = 'public'
                 AND table_name IN ('gmp_case_categories','gmp_case_client_advances','gmp_payment_installments','gmp_case_assignees','gmp_task_types')
               ORDER BY table_name"""
        )
        print("Nowe tabele:")
        for r in cur.fetchall():
            print(f"  [OK] {r[0]}")

        # Nowe views
        cur.execute(
            """SELECT table_name FROM information_schema.views
               WHERE table_schema = 'public'
                 AND table_name IN ('gmp_case_balance','gmp_case_assignees_view','gmp_staff_effectiveness','gmp_staff_tasks_monthly','gmp_employer_inaction_alerts')
               ORDER BY table_name"""
        )
        print("Nowe views:")
        for r in cur.fetchall():
            print(f"  [OK] {r[0]}")

        # Kategorie wpisane
        cur.execute(
            "SELECT COUNT(*) FROM gmp_case_categories WHERE is_active = TRUE"
        )
        count = cur.fetchone()[0]
        print(f"Aktywne kategorie: {count}")

        # Tagi Pawla
        cur.execute(
            "SELECT COUNT(*) FROM gmp_tags WHERE name IN ('czeka-na-przeniesienie','czeka-na-dok-pracodawcy','APT','OUTSOURCING','problematyczny','pretensje','brak-reakcji-urzedu','zaleglosci-finansowe')"
        )
        count = cur.fetchone()[0]
        print(f"Nowe tagi Pawla: {count}/8")

        # Etapy
        cur.execute(
            """SELECT unnest(enum_range(NULL::gmp_case_stage))::text"""
        )
        stages = [r[0] for r in cur.fetchall()]
        new_stages = ['wezwanie','uzupelnienie_dokumentow','przyspieszenie','wydluzenie_terminu','przeniesienie_z_innego_wojewodztwa','wniosek_przeniesiony']
        print(f"Nowe etapy: {sum(1 for s in new_stages if s in stages)}/6")
        for s in new_stages:
            print(f"  {'OK' if s in stages else 'BRAK':4s} {s}")

        # Oddzialy
        cur.execute(
            "SELECT code FROM gmp_office_departments WHERE code IN ('PC 1','PC 2','PC 3','PC 4','OP — OBYWATELSTWO','OCII','OCI','OBYWATELSTWO','DUE') ORDER BY code"
        )
        depts = [r[0] for r in cur.fetchall()]
        print(f"Oddzialy po czysczeniu:")
        for d in depts:
            tag = "(zostaje)" if d in ('PC 1','PC 2','PC 3','PC 4','OP — OBYWATELSTWO') else "(POWINIEN BYC USUNIETY)"
            print(f"  {d} {tag}")

        # Nieaktywni opiekunowie
        cur.execute(
            "SELECT full_name FROM gmp_staff WHERE is_active = FALSE AND lower(full_name) IN ('mateusz lis','olha kovalova','konto testowe','michał','michal','natalia')"
        )
        print(f"Dezaktywowani opiekunowie:")
        for r in cur.fetchall():
            print(f"  OK {r[0]}")

    print("\nSukces.")
finally:
    conn.close()

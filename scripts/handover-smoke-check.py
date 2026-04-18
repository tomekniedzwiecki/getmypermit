"""Smoke-check przed handover: sprawdza że Paweł ma sprawne konto + schema admin panel'a jest OK"""
import os, psycopg
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

REF = os.environ["SUPABASE_PROJECT_REF"]
PWD = os.environ["SUPABASE_DB_PASSWORD"]

conn = psycopg.connect(host="aws-0-eu-west-1.pooler.supabase.com", port=5432,
                      user=f"postgres.{REF}", password=PWD, dbname="postgres", sslmode="require")

issues = []
ok = []

with conn.cursor() as cur:
    # 1. Pawel konto
    cur.execute("""SELECT s.id, s.email, s.full_name, s.role, s.user_id, s.last_login_at, s.login_count,
                   u.email AS auth_email, u.email_confirmed_at
                   FROM gmp_staff s LEFT JOIN auth.users u ON u.id = s.user_id
                   WHERE LOWER(s.email) IN ('p.stachurski@adwokaci-sg.pl', 'tomekniedzwiecki@gmail.com')""")
    for r in cur.fetchall():
        sid, email, name, role, uid, last_login, lcount, auth_email, confirmed = r
        tag = f"[{email}]"
        if role != 'owner':
            issues.append(f"{tag} rola={role} (oczekiwana: owner)")
        else:
            ok.append(f"{tag} rola=owner OK")
        if not uid:
            issues.append(f"{tag} BRAK user_id w gmp_staff - uzytkownik NIE zaloguje sie")
        elif not auth_email:
            issues.append(f"{tag} user_id istnieje ale auth.users nie znaleziony - nie zaloguje sie")
        elif not confirmed:
            issues.append(f"{tag} email niepotwierdzony w auth.users - zaloguje sie magic linkiem")
        else:
            ok.append(f"{tag} auth OK (confirmed {confirmed.strftime('%Y-%m-%d')})")
        ok.append(f"{tag} last_login={last_login}, login_count={lcount}")

    # 2. Kolumny ktorych admin.js oczekuje
    cur.execute("""SELECT column_name FROM information_schema.columns
                   WHERE table_name='gmp_cases' AND column_name IN ('assigned_to','date_closed','fee_amount','status','stage','date_last_activity','inactivity_reason')""")
    case_cols = {r[0] for r in cur.fetchall()}
    expected = {'assigned_to','date_closed','fee_amount','status','stage','date_last_activity','inactivity_reason'}
    missing = expected - case_cols
    if missing:
        issues.append(f"gmp_cases: brakuje kolumn uzywanych przez admin.js: {missing}")
    else:
        ok.append("gmp_cases: wszystkie kolumny admin.js OK")

    cur.execute("""SELECT column_name FROM information_schema.columns WHERE table_name='gmp_invoices'""")
    inv_cols = {r[0] for r in cur.fetchall()}
    if 'amount_gross' not in inv_cols:
        # check alt names
        alt = [c for c in inv_cols if 'amount' in c]
        issues.append(f"gmp_invoices: brak 'amount_gross' - admin.js oczekuje tej kolumny. Dostepne: {alt}")
    else:
        ok.append("gmp_invoices.amount_gross OK")

    cur.execute("""SELECT column_name FROM information_schema.columns WHERE table_name='gmp_tasks'""")
    task_cols = {r[0] for r in cur.fetchall()}
    for c in ['assigned_to','due_date','completed_at']:
        if c not in task_cols:
            issues.append(f"gmp_tasks: brak kolumny {c}")
    if all(c in task_cols for c in ['assigned_to','due_date','completed_at']):
        ok.append("gmp_tasks: kolumny OK")

    # 3. Views + funkcje
    cur.execute("SELECT 1 FROM information_schema.views WHERE table_name='gmp_live_activity'")
    if cur.fetchone(): ok.append("view gmp_live_activity OK")
    else: issues.append("view gmp_live_activity MISSING")

    cur.execute("SELECT 1 FROM information_schema.routines WHERE routine_name='gmp_audit_log_add'")
    if cur.fetchone(): ok.append("RPC gmp_audit_log_add OK")
    else: issues.append("RPC gmp_audit_log_add MISSING")

    cur.execute("SELECT 1 FROM information_schema.routines WHERE routine_name='gmp_staff_touch_login'")
    if cur.fetchone(): ok.append("RPC gmp_staff_touch_login OK")
    else: issues.append("RPC gmp_staff_touch_login MISSING")

    # 4. Liczba prawnikow z przypisanymi sprawami (czy staff tab ma cokolwiek pokazac)
    cur.execute("SELECT COUNT(DISTINCT assigned_to) FROM gmp_cases WHERE assigned_to IS NOT NULL AND status IN ('zlecona','aktywna')")
    n = cur.fetchone()[0]
    ok.append(f"Prawnikow z aktywnymi sprawami: {n}")

    # 5. Liczba faktur / spraw / klientow
    cur.execute("SELECT (SELECT COUNT(*) FROM gmp_cases), (SELECT COUNT(*) FROM gmp_clients), (SELECT COUNT(*) FROM gmp_invoices), (SELECT COUNT(*) FROM gmp_case_activities)")
    r = cur.fetchone()
    ok.append(f"Wolumen danych: {r[0]} spraw, {r[1]} klientow, {r[2]} faktur, {r[3]} aktywnosci")

conn.close()

print("=== OK ===")
for m in ok: print(f"  v {m}")
print()
print("=== ISSUES ===" if issues else "=== BRAK ISSUES ===")
for m in issues: print(f"  ! {m}")
print()
print(f"Summary: {len(ok)} OK, {len(issues)} issues")

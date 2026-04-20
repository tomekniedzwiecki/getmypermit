"""
Audyt kompletnosci wdrozenia uwag Pawla z 2026-04-20.

Dla każdego punktu uwag sprawdza:
- DB: tabele, kolumny, enumy, views, RPC, cron jobs
- REST: czy endpointy zwracają 200 z aktualnym schematem
- UI (grep): czy kluczowe elementy są w plikach HTML
"""
import os, re, sys, requests
from pathlib import Path
from dotenv import load_dotenv
import psycopg

load_dotenv(Path(__file__).parent.parent / ".env")

REF = os.environ["SUPABASE_PROJECT_REF"]
PWD = os.environ["SUPABASE_DB_PASSWORD"]
URL = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

ROOT = Path(__file__).parent.parent

import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

conn = psycopg.connect(
    host="aws-0-eu-west-1.pooler.supabase.com", port=5432,
    user=f"postgres.{REF}", password=PWD, dbname="postgres", sslmode="require",
)

results = []  # list of (section, item, status, detail)

def record(section, item, status, detail=""):
    results.append((section, item, status, detail))

def sql1(query, *args):
    with conn.cursor() as c:
        c.execute(query, args)
        r = c.fetchone()
        return r[0] if r else None

def sql_exists(query, *args):
    return sql1(query, *args) is not None

def has_column(table, col):
    return sql_exists(
        "SELECT 1 FROM information_schema.columns WHERE table_name=%s AND column_name=%s",
        table, col,
    )

def has_table(table):
    return sql_exists(
        "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=%s",
        table,
    )

def has_view(view):
    return sql_exists(
        "SELECT 1 FROM information_schema.views WHERE table_schema='public' AND table_name=%s",
        view,
    )

def has_function(fn):
    return sql_exists("SELECT 1 FROM pg_proc WHERE proname=%s", fn)

def has_enum_value(enum_name, value):
    with conn.cursor() as c:
        c.execute(
            "SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname=%s AND e.enumlabel=%s",
            (enum_name, value),
        )
        return c.fetchone() is not None

def grep_file(path, pattern):
    full = ROOT / path
    if not full.exists(): return False
    content = full.read_text(encoding="utf-8", errors="replace")
    return bool(re.search(pattern, content))

def rest_ok(endpoint, params=""):
    try:
        r = requests.get(f"{URL}/rest/v1/{endpoint}?{params}&limit=1", headers=H, timeout=10)
        return r.status_code == 200, r.text[:100]
    except Exception as e:
        return False, str(e)

# ==========================================================================
# SEKCJA 1: PŁATNOŚCI (uwagi pkt 1)
# ==========================================================================
print("=== PŁATNOŚCI ===")

# 1.1 Plan płatności z ratami per data
record("1.1 Plan rat", "tabela gmp_payment_installments", has_table("gmp_payment_installments"))
record("1.1 Plan rat", "kolumna installment_id na gmp_payments", has_column("gmp_payments", "installment_id"))
record("1.1 Plan rat", "trigger markuje ratę jako paid", has_function("gmp_mark_installment_paid"))
record("1.1 Plan rat", "RPC gmp_generate_installment_tasks", has_function("gmp_generate_installment_tasks"))
record("1.1 Plan rat", "UI plan rat w case.html", grep_file("crm/case.html", r"renderInstallmentsPlan"))
record("1.1 Plan rat", "UI edytor rat w case.html", grep_file("crm/case.html", r"openInstallmentsEditor"))
record("1.1 Plan rat", "UI markInstallmentPaid", grep_file("crm/case.html", r"markInstallmentPaid"))

# Cron dla zadań dziennych
with conn.cursor() as c:
    c.execute("SELECT jobname, schedule FROM cron.job WHERE jobname LIKE 'gmp_%'")
    jobs = c.fetchall()
record("1.1 Cron", "pg_cron zadania (gmp_daily_installment_tasks + gmp_daily_mark_overdue)",
       len(jobs) >= 2, f"{len(jobs)} jobs: {jobs}")

# 1.2 Opłata skarbowa + administracyjna na karcie sprawy
record("1.2 Typy opłat", "enum stamp_fee", has_enum_value("gmp_payment_kind", "stamp_fee"))
record("1.2 Typy opłat", "enum client_advance", has_enum_value("gmp_payment_kind", "client_advance"))
record("1.2 Typy opłat", "enum client_advance_repayment", has_enum_value("gmp_payment_kind", "client_advance_repayment"))
record("1.2 Typy opłat", "kolumna admin_fee_amount", has_column("gmp_cases", "admin_fee_amount"))
record("1.2 Typy opłat", "kolumna stamp_fee_amount", has_column("gmp_cases", "stamp_fee_amount"))
record("1.2 Typy opłat", "kolumna client_advances_amount", has_column("gmp_cases", "client_advances_amount"))
record("1.2 Typy opłat", "UI 4 pola planowanych kwot w case.html",
       all(grep_file("crm/case.html", f'data-field="{k}"') for k in ['admin_fee_amount','stamp_fee_amount','client_advances_amount']))
record("1.2 Typy opłat", "UI 4 kafelki finansów w case.html",
       grep_file("crm/case.html", r"kpiCard\('Wynagrodzenie'") and
       grep_file("crm/case.html", r"kpiCard\('Opł. administracyjna'") and
       grep_file("crm/case.html", r"kpiCard\('Opł. skarbowa'") and
       grep_file("crm/case.html", r"kpiCard\('Założone za klienta'"))

# 1.3 Opłaty do zwrotu
record("1.3 Opłaty za klienta", "tabela gmp_case_client_advances", has_table("gmp_case_client_advances"))
record("1.3 Opłaty za klienta", "trigger synchronizacji sumy",
       sql_exists("SELECT 1 FROM pg_trigger WHERE tgname = %s", "trg_sync_client_advances_total"))
record("1.3 Opłaty za klienta", "UI sekcja w case.html",
       grep_file("crm/case.html", r'id="finance-client-advances"'))
record("1.3 Opłaty za klienta", "UI addClientAdvance", grep_file("crm/case.html", r"addClientAdvance"))
record("1.3 Opłaty za klienta", "UI markAdvanceRepaid", grep_file("crm/case.html", r"markAdvanceRepaid"))

# 1.4 Wprowadzanie ręczne (nie ma nic do zrobienia — brak integracji to stan)

# 1.5 Lista spraw — zaległości zamiast wpłat
record("1.5 Zaległości", "view gmp_case_balance", has_view("gmp_case_balance"))
record("1.5 Zaległości", "UI kolumna Zaległość w cases.html",
       grep_file("crm/cases.html", r'data-sort="balance_due"'))
record("1.5 Zaległości", "UI czerwona kropka dla overdue",
       grep_file("crm/cases.html", r"overdue_installments_amount"))

# ==========================================================================
# SEKCJA 2: STATUSY (bez zmian)
# ==========================================================================
# Brak wymagań

# ==========================================================================
# SEKCJA 3: ETAPY (6 nowych)
# ==========================================================================
print("=== ETAPY ===")
for v in ['wezwanie','uzupelnienie_dokumentow','przyspieszenie','wydluzenie_terminu','przeniesienie_z_innego_wojewodztwa','wniosek_przeniesiony']:
    record("3 Etapy", f"enum value: {v}", has_enum_value("gmp_case_stage", v))
    record("3 Etapy", f"UI cases.html etap: {v}", grep_file("crm/cases.html", f'value="{v}"'))
    record("3 Etapy", f"UI case.html etap: {v}", grep_file("crm/case.html", f'value="{v}"'))

# ==========================================================================
# SEKCJA 4: TAGI (8 nowych)
# ==========================================================================
print("=== TAGI ===")
for t in ['czeka-na-przeniesienie','czeka-na-dok-pracodawcy','APT','OUTSOURCING','problematyczny','pretensje','brak-reakcji-urzedu','zaleglosci-finansowe']:
    record("4 Tagi", f"tag: {t}", sql_exists("SELECT 1 FROM gmp_tags WHERE name=%s", t))

# ==========================================================================
# SEKCJA 5: KATEGORIE (25)
# ==========================================================================
print("=== KATEGORIE ===")
record("5 Kategorie", "tabela gmp_case_categories", has_table("gmp_case_categories"))
active_cats = sql1("SELECT COUNT(*) FROM gmp_case_categories WHERE is_active = TRUE")
record("5 Kategorie", "25 aktywnych kategorii", active_cats == 25, f"{active_cats}/25")
# 11 + 4 + 10 grup
for code in ['pobyt_praca','pobyt_staly_malzenstwo','rezydent','obywatelstwo_nadanie','deportacja','transkrypcja']:
    record("5 Kategorie", f"kod {code}",
           sql_exists("SELECT 1 FROM gmp_case_categories WHERE code=%s AND is_active=TRUE", code))
record("5 Kategorie", "UI ładowanie dynamiczne cases.html",
       grep_file("crm/cases.html", r"gmp_case_categories"))
record("5 Kategorie", "UI select z DB w case.html",
       grep_file("crm/case.html", r'id="category-select"'))

# ==========================================================================
# SEKCJA 6: OPIEKUN — dezaktywacja 5
# ==========================================================================
print("=== OPIEKUNOWIE ===")
for n in ['mateusz lis','olha kovalova','konto testowe','michał','natalia']:
    is_inactive = sql_exists("SELECT 1 FROM gmp_staff WHERE lower(full_name)=%s AND is_active=FALSE", n)
    record("6 Opiekunowie", f"zdezaktywowany: {n}", is_inactive)

# ==========================================================================
# SEKCJA 7: ODDZIAŁ
# ==========================================================================
print("=== ODDZIAŁY ===")
for rem in ['OCII','OC II','OCI','OBYWATELSTWO','DUE']:
    removed = not sql_exists("SELECT 1 FROM gmp_office_departments WHERE code=%s", rem)
    record("7 Oddziały", f"usunięty: {rem}", removed)
for keep in ['PC 1','PC 2','PC 3','PC 4','OP — OBYWATELSTWO']:
    exists = sql_exists("SELECT 1 FROM gmp_office_departments WHERE code=%s", keep)
    record("7 Oddziały", f"obecny: {keep}", exists)

# ==========================================================================
# SEKCJA 8: KARTA SPRAWY — nowe pola
# ==========================================================================
print("=== KARTA SPRAWY ===")
record("8 Pola", "legal_stay_end_date", has_column("gmp_cases", "legal_stay_end_date"))
record("8 Pola", "document_location", has_column("gmp_cases", "document_location"))
record("8 Pola", "accepted_by", has_column("gmp_cases", "accepted_by"))
record("8 Pola", "assigned_at", has_column("gmp_cases", "assigned_at"))

# Multi-opiekun
record("8 Multi-opiekun", "tabela gmp_case_assignees", has_table("gmp_case_assignees"))
record("8 Multi-opiekun", "max 3 trigger",
       sql_exists("SELECT 1 FROM pg_trigger WHERE tgname=%s", "trg_gmp_enforce_max_assignees"))
record("8 Multi-opiekun", "single primary trigger",
       sql_exists("SELECT 1 FROM pg_trigger WHERE tgname=%s", "trg_gmp_enforce_single_primary"))
record("8 Multi-opiekun", "sync primary → cases.assigned_to",
       sql_exists("SELECT 1 FROM pg_trigger WHERE tgname=%s", "trg_gmp_sync_primary_assignee"))
backfill_count = sql1("SELECT COUNT(*) FROM gmp_case_assignees WHERE role_type='primary'")
record("8 Multi-opiekun", "backfill primary", backfill_count > 0, f"{backfill_count} rekordów primary")
record("8 Multi-opiekun", "UI loadAdditionalAssignees", grep_file("crm/case.html", r"loadAdditionalAssignees"))
record("8 Multi-opiekun", "UI addAssignee", grep_file("crm/case.html", r"function addAssignee"))
record("8 Multi-opiekun", "UI removeAssignee", grep_file("crm/case.html", r"function removeAssignee"))

# Kolumny w cases.html
record("8 Lista", "UI data złożenia wniosku (Złożony)",
       grep_file("crm/cases.html", r'data-sort="date_submitted"'))
record("8 Lista", "UI sortowanie po legal_stay_end_date",
       grep_file("crm/cases.html", r'data-sort="legal_stay_end_date"'))
record("8 Lista", "UI dni od przystąpienia (kolumna)",
       grep_file("crm/cases.html", r'Dni od przyst'))

# ==========================================================================
# SEKCJA 9: TERMINY — typy + show_in_calendar + visibility
# ==========================================================================
print("=== TERMINY I KALENDARZ ===")
record("9 Zadania", "gmp_tasks.task_type", has_column("gmp_tasks", "task_type"))
record("9 Zadania", "gmp_tasks.show_in_calendar", has_column("gmp_tasks", "show_in_calendar"))
record("9 Zadania", "gmp_tasks.visibility", has_column("gmp_tasks", "visibility"))
record("9 Zadania", "słownik gmp_task_types", has_table("gmp_task_types"))
cnt_types = sql1("SELECT COUNT(*) FROM gmp_task_types WHERE is_active=TRUE")
record("9 Zadania", "9 typów terminów", cnt_types >= 9, f"{cnt_types}")
record("9 UI tasks.html", "filtr typu terminu", grep_file("crm/tasks.html", r'id="f-task-type"'))
record("9 UI tasks.html", "kolumna W kal.", grep_file("crm/tasks.html", r"W kal\."))
record("9 UI tasks.html", "ikona kłódki private", grep_file("crm/tasks.html", r"ph-lock"))
record("9 Kalendarz", "toggle Tylko moje",
       grep_file("crm/appointments.html", r'id="only-mine-toggle"'))
record("9 Kalendarz", "zadania w kalendarzu",
       grep_file("crm/appointments.html", r"visibleTasks"))
record("9 Kalendarz", "respekt private",
       grep_file("crm/appointments.html", r"t\.visibility !== 'private'"))

# ==========================================================================
# SEKCJA 10-11: ZESTAWIENIA + ALERT PRACODAWCA
# ==========================================================================
print("=== ZESTAWIENIA + ALERTY ===")
record("10 Staff stats", "view gmp_staff_effectiveness", has_view("gmp_staff_effectiveness"))
record("10 Staff stats", "view gmp_staff_tasks_monthly", has_view("gmp_staff_tasks_monthly"))
record("10 Staff stats", "UI kolumna Zal. fin. w staff.html",
       grep_file("crm/staff.html", r"Zal\. fin\."))
record("11 Alert pracodawca", "view gmp_employer_inaction_alerts", has_view("gmp_employer_inaction_alerts"))
record("11 Alert pracodawca", "UI sekcja w alerts.html",
       grep_file("crm/alerts.html", r'id="employer-inaction"'))
record("11 Alert pracodawca", "UI loadEmployerInaction",
       grep_file("crm/alerts.html", r"loadEmployerInaction"))

# ==========================================================================
# SEKCJA 12: ANKIETA
# ==========================================================================
print("=== ANKIETA ===")
# Pola z listy Pawła
for f in ['previous_first_names','maiden_name','father_first_name','mother_first_name','mother_maiden_name',
          'birth_place','country_of_origin','marital_status','height_cm','eye_color','distinguishing_marks',
          'trusted_profile','family_in_pl','stays_outside_pl_5y','arrival_document_type','arrival_visa_eu_purpose',
          'employer_phone','employer_email']:
    record("12 Ankieta pola", f, grep_file("crm/case.html", f"'{f}'"))
record("12 Ankieta", "openManualIntakeEditor w case.html",
       grep_file("crm/case.html", r"openManualIntakeEditor"))
record("12 Ankieta", "przycisk Wypełnij z palca",
       grep_file("crm/case.html", r"Wypełnij z palca"))
# Zatwierdzanie dokumentów
record("12 Zatwierdzanie dok.", "RPC gmp_approve_intake_document", has_function("gmp_approve_intake_document"))
record("12 Zatwierdzanie dok.", "kolumna approved_at",
       has_column("gmp_intake_documents", "approved_at"))
record("12 Zatwierdzanie dok.", "kolumna gmp_document_id",
       has_column("gmp_intake_documents", "gmp_document_id"))
record("12 Zatwierdzanie dok.", "kolumna source w gmp_documents",
       has_column("gmp_documents", "source"))
record("12 Zatwierdzanie dok.", "UI approveIntakeDoc",
       grep_file("crm/case.html", r"window\.approveIntakeDoc"))
record("12 Zatwierdzanie dok.", "UI sekcja Do zatwierdzenia",
       grep_file("crm/case.html", r"Do zatwierdzenia z ankiety"))

# ==========================================================================
# SEKCJA 13: KALENDARZ — private tasks + widok tylko moje
# ==========================================================================
# (Już zweryfikowane w 9)

# ==========================================================================
# SEKCJA 14-16 — ŚWIADOMIE NIEZREALIZOWANE (czekają na dane/decyzję)
# ==========================================================================
# Te nie są w audycie — wymagają danych od Pawła

# ==========================================================================
# SEKCJA REST API — kluczowe endpointy
# ==========================================================================
print("=== REST API SMOKE TEST ===")
rest_tests = [
    ("gmp_case_categories", "select=*"),
    ("gmp_case_balance", "select=case_id,balance_due"),
    ("gmp_case_client_advances", "select=*"),
    ("gmp_payment_installments", "select=*"),
    ("gmp_case_assignees", "select=*"),
    ("gmp_task_types", "select=*"),
    ("gmp_staff_effectiveness", "select=*"),
    ("gmp_employer_inaction_alerts", "select=*"),
]
for ep, params in rest_tests:
    ok, detail = rest_ok(ep, params)
    record("REST", f"{ep} — {params[:30]}", ok, detail[:80] if not ok else "")

# ==========================================================================
# KLUCZOWE EMBED Z gmp_cases (regression po dodaniu accepted_by → 2 FK do gmp_staff)
# ==========================================================================
print("=== POSTGREST EMBEDS ===")
embed_tests = [
    ("cases.html list", "gmp_cases",
     "gmp_clients(last_name),gmp_staff!assigned_to(full_name),gmp_office_departments(code)"),
    ("case.html detail", "gmp_cases",
     "gmp_clients(last_name),gmp_staff!assigned_to(full_name)"),
    ("Staff activities", "gmp_case_activities", "gmp_staff!created_by(full_name)"),
    ("Tasks assigned", "gmp_tasks", "gmp_staff!assigned_to(full_name)"),
]
for label, tbl, sel in embed_tests:
    try:
        r = requests.get(f"{URL}/rest/v1/{tbl}?select=id,{sel}&limit=1", headers=H, timeout=10)
        record("REST embed", label, r.status_code == 200, f"{r.status_code}: {r.text[:60]}")
    except Exception as e:
        record("REST embed", label, False, str(e))

# ==========================================================================
# WYJŚCIE
# ==========================================================================
conn.close()

ok = sum(1 for _, _, s, _ in results if s)
fail = sum(1 for _, _, s, _ in results if not s)

print("\n" + "=" * 80)
print(f"WYNIK: {ok} OK / {fail} FAIL")
print("=" * 80)

# Sekcje
sections = {}
for section, item, status, detail in results:
    sections.setdefault(section, []).append((item, status, detail))

for section, items in sections.items():
    section_ok = sum(1 for _, s, _ in items if s)
    section_fail = sum(1 for _, s, _ in items if not s)
    marker = "OK" if section_fail == 0 else f"FAIL {section_fail}/{len(items)}"
    print(f"\n[{marker}] {section}")
    for item, status, detail in items:
        icon = " OK " if status else "FAIL"
        det = f" — {detail}" if detail and not status else ""
        print(f"    [{icon}] {item}{det}")

if fail:
    sys.exit(1)

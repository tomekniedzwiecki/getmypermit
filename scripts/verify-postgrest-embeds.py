"""
Weryfikuje ze PostgREST akceptuje wszystkie embedowania gmp_staff w kontekscie gmp_cases.
Wywoluje wszystkie select() z plikow .html, sprawdza czy jest ambiguity-error.
"""
import os, re, sys, requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

URL = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
HEAD = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Accept": "application/json",
}

# Lista zapytan ktore uzywamy w aplikacji po naszych zmianach
QUERIES = [
    # cases.html
    ("gmp_cases", "id, case_number, znak_sprawy, status, stage, case_type, category, submission_method, date_accepted, date_submitted, date_joined, legal_stay_end_date, date_last_activity, fee_amount, assigned_to, client_id, employer_id, department_id, is_pinned, gmp_clients(last_name, first_name), gmp_employers(name), gmp_staff!assigned_to(full_name), gmp_office_departments(code)"),
    # case.html
    ("gmp_cases", "*, gmp_clients(*), gmp_employers(*), gmp_staff!assigned_to(full_name), gmp_office_departments(code, name), gmp_inspectors(full_name), gmp_offices(name, city)"),
    # alerts.html
    ("gmp_cases", "id, case_number, gmp_clients(last_name, first_name), gmp_staff!assigned_to(full_name)"),
    # clients.html
    ("gmp_cases", "id, case_number, case_type, status, stage, category, date_accepted, fee_amount, gmp_staff!assigned_to(full_name)"),
    # kanban.html
    ("gmp_cases", "id, case_number, znak_sprawy, status, stage, case_type, category, fee_amount, date_last_activity, is_pinned, inactivity_reason, assigned_to, client_id, gmp_clients(last_name, first_name), gmp_staff!assigned_to(full_name), gmp_employers(name)"),
    # work-permits.html
    ("gmp_cases", "id, case_number, znak_sprawy, status, case_type, date_accepted, date_submitted, date_last_activity, fee_amount, assigned_to, employer_id, gmp_employers(id, name, nip), gmp_staff!assigned_to(full_name)"),
    # dashboard.html #1
    ("gmp_cases", "id, case_number, gmp_clients(last_name, first_name), gmp_staff!assigned_to(full_name)"),
    # dashboard.html #2 - activities
    ("gmp_case_activities", "id, activity_type, content, created_at, case_id, created_by, gmp_cases(case_number, gmp_clients(last_name, first_name)), gmp_staff!created_by(full_name)"),
    # employers.html
    ("gmp_cases", "id, case_number, case_type, status, date_accepted, fee_amount, gmp_clients(last_name, first_name), gmp_staff!assigned_to(full_name)"),
    # payments.html - plans z cases z staff
    ("gmp_payment_plans", "id, case_id, total_amount, due_date, payer_type, gmp_cases(case_number, status, gmp_clients(last_name, first_name), gmp_employers(name), gmp_staff!assigned_to(full_name))"),
    # tasks.html
    ("gmp_tasks", "*, gmp_staff!assigned_to(full_name), gmp_cases(id, case_number, gmp_clients(last_name, first_name))"),
    # appointments.html (CRM uzywa gmp_crm_appointments, nie gmp_appointments)
    ("gmp_crm_appointments", "id, appointment_type, scheduled_date, scheduled_time, client_id, case_id, staff_id, title, notes, transport_type, contact_name, gmp_clients(last_name, first_name), gmp_staff!staff_id(full_name)"),
    # case.html - activities / tasks / appointments
    ("gmp_case_activities", "*, gmp_staff!created_by(full_name)"),
    ("gmp_tasks", "*, gmp_staff!assigned_to(full_name)"),
    ("gmp_appointments", "*, gmp_staff!staff_id(full_name), gmp_offices(name, city)"),
    # case.html - multi-opiekunowie
    ("gmp_case_assignees", "staff_id, role_type, assigned_at, gmp_staff!staff_id(full_name, color)"),
    # admin.js - audit
    ("gmp_credentials_access_log", "*, gmp_staff!accessed_by(full_name, email), gmp_trusted_profile_credentials(gmp_clients(first_name, last_name))"),
    # Nowe tabele i views z 2026-04-20
    ("gmp_case_categories", "code, label, group_label, sort_order, is_active"),
    ("gmp_case_balance", "case_id, total_planned, total_paid, balance_due, overdue_installments_amount"),
    ("gmp_case_client_advances", "*"),
    ("gmp_payment_installments", "*"),
    ("gmp_case_assignees", "*, gmp_staff!staff_id(full_name, color)"),
    ("gmp_case_assignees_view", "*"),
    ("gmp_staff_effectiveness", "staff_id, full_name, cases_active, tasks_overdue, pending_balance"),
    ("gmp_staff_tasks_monthly", "*"),
    ("gmp_employer_inaction_alerts", "*"),
    ("gmp_task_types", "code, label, sort_order"),
    # Kalendarz + tasks
    ("gmp_tasks", "id, title, description, due_date, task_type, visibility, show_in_calendar, assigned_to, case_id, created_by, gmp_cases(case_number, gmp_clients(last_name, first_name)), gmp_staff!assigned_to(full_name)"),
    # Alerts - employer inaction bezposrednio z view
    ("gmp_employer_inaction_alerts", "case_id, case_number, client_id, employer_id, assigned_to, days_since_activity, alert_level"),
    # staff.html
    ("gmp_staff_effectiveness", "staff_id, pending_balance"),
]

ok = 0
fail = 0
errors = []

for table, select in QUERIES:
    url = f"{URL}/rest/v1/{table}?select={select}&limit=1"
    try:
        r = requests.get(url, headers=HEAD, timeout=10)
        if r.status_code == 200:
            ok += 1
            print(f"[OK] {table}: {select[:80]}{'...' if len(select) > 80 else ''}")
        else:
            fail += 1
            msg = r.text[:300]
            errors.append((table, select, msg))
            print(f"[FAIL {r.status_code}] {table}: {msg}")
    except Exception as e:
        fail += 1
        errors.append((table, select, str(e)))
        print(f"[EXC] {table}: {e}")

print(f"\n=== {ok} OK, {fail} FAIL ===")
if fail:
    print("\nFail details:")
    for table, sel, err in errors:
        print(f"  {table}: {sel[:100]}")
        print(f"    -> {err[:200]}")
    sys.exit(1)

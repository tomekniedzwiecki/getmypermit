"""Usuwa dane z tabel CRM (do ponownego importu po fix)."""
import os, requests
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

URL = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

# Kolejnosc: dzieci przed rodzicami
TABLES = [
    "gmp_case_activities",
    "gmp_orphan_decisions",
    "gmp_payments",
    "gmp_payment_plans",
    "gmp_invoices",
    "gmp_submissions_queue",
    "gmp_cases",
    "gmp_clients",
    "gmp_employers",
    "gmp_inspectors",
    "gmp_staff",
    "gmp_office_departments",
    "gmp_offices",
]

for t in TABLES:
    r = requests.get(f"{URL}/rest/v1/{t}?select=count", headers={**H, "Prefer":"count=exact", "Range":"0-0"})
    before = r.headers.get("content-range", "0-0/0").split("/")[-1]
    if before == "0":
        print(f"  {t:35s} pusta")
        continue
    r = requests.delete(f"{URL}/rest/v1/{t}?id=neq.00000000-0000-0000-0000-000000000000", headers=H)
    r.raise_for_status()
    r = requests.get(f"{URL}/rest/v1/{t}?select=count", headers={**H, "Prefer":"count=exact", "Range":"0-0"})
    after = r.headers.get("content-range", "0-0/0").split("/")[-1]
    print(f"  {t:35s} {before} -> {after}")

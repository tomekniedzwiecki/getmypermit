"""Czysci kolejke wnioskow (gmp_submissions_queue).

Pawel: "Na ten moment nie przenosimy spraw do kolejki wnioskow.
Sprawy juz tam zakwalifikowane powinny zostac usuniete.
Kolejka bedzie wykorzystywana wylacznie do nowych wnioskow skladanych w przyszlosci."

Uzycie:
    python scripts/clear-submissions-queue.py
"""
import os, requests, sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

URL = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

TABLE = "gmp_submissions_queue"

r = requests.get(
    f"{URL}/rest/v1/{TABLE}?select=count",
    headers={**H, "Prefer": "count=exact", "Range": "0-0"},
)
before = r.headers.get("content-range", "0-0/0").split("/")[-1]
print(f"Aktualnie w kolejce: {before} wierszy")

if before == "0":
    print("Nic do zrobienia.")
    sys.exit(0)

confirm = input(f"Usunac wszystkie {before} wpisow z {TABLE}? [tak/nie] ").strip().lower()
if confirm not in ("tak", "t", "yes", "y"):
    print("Anulowano.")
    sys.exit(0)

r = requests.delete(
    f"{URL}/rest/v1/{TABLE}?id=neq.00000000-0000-0000-0000-000000000000",
    headers=H,
)
r.raise_for_status()

r = requests.get(
    f"{URL}/rest/v1/{TABLE}?select=count",
    headers={**H, "Prefer": "count=exact", "Range": "0-0"},
)
after = r.headers.get("content-range", "0-0/0").split("/")[-1]
print(f"Po czyszczeniu: {after} wierszy ({before} -> {after})")

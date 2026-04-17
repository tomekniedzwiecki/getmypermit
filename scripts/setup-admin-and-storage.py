"""
Setup po imporcie:
1. Tworzy konto Supabase Auth dla Tomka (admin)
2. Linkuje to konto z rekordem gmp_staff (rola admin)
3. Tworzy Storage bucket dla dokumentow
4. Dodaje dev RLS policy na storage
"""
import os, requests
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

URL = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

ADMIN_EMAIL = "tomekniedzwiecki@gmail.com"
ADMIN_PASSWORD = "GetMyPermit2026!"   # Tomek zmieni po pierwszym logowaniu

print("=== 1. Tworze konto admina ===")
# Supabase Admin API: /auth/v1/admin/users
r = requests.post(
    f"{URL}/auth/v1/admin/users",
    headers={"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
    json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD,
        "email_confirm": True,
        "user_metadata": {"full_name": "Tomasz Niedźwiecki", "role": "admin"}
    }
)
if r.status_code == 200 or r.status_code == 201:
    user = r.json()
    print(f"  OK: {user.get('id')} ({user.get('email')})")
    user_id = user.get('id')
elif r.status_code == 422 and "already" in r.text.lower():
    # Uzytkownik istnieje - pobierz ID
    r2 = requests.get(f"{URL}/auth/v1/admin/users", headers=H)
    users = r2.json().get('users', [])
    user = next((u for u in users if u['email'] == ADMIN_EMAIL), None)
    if not user:
        print(f"  BLAD: Uzytkownik {ADMIN_EMAIL} istnieje ale nie moge znalezc")
        exit(1)
    user_id = user['id']
    print(f"  Istnieje: {user_id} ({ADMIN_EMAIL})")
    # Zresetuj haslo
    requests.put(f"{URL}/auth/v1/admin/users/{user_id}", headers=H, json={"password": ADMIN_PASSWORD, "email_confirm": True})
    print(f"  Haslo zresetowane")
else:
    print(f"  BLAD: {r.status_code} {r.text}")
    exit(1)

print("\n=== 2. Podpinam user_id do gmp_staff (Paweł lub nowy admin rekord) ===")
# Sprawdz czy jest rekord admina w gmp_staff
r = requests.get(f"{URL}/rest/v1/gmp_staff?role=eq.admin&limit=5", headers=H)
admins = r.json()
if admins:
    # Update pierwszego admina (Pawla z importu) z user_id... ale to chyba nie Tomek
    # Lepiej stworzyc osobny rekord dla Tomka
    pass

# Stworz/zaktualizuj rekord Tomka
r = requests.get(f"{URL}/rest/v1/gmp_staff?email=eq.{ADMIN_EMAIL}&limit=1", headers=H)
existing = r.json()
if existing:
    sid = existing[0]['id']
    requests.patch(
        f"{URL}/rest/v1/gmp_staff?id=eq.{sid}",
        headers={**H, "Prefer": "return=minimal"},
        json={"user_id": user_id, "role": "admin"}
    )
    print(f"  Update istniejacego staff {sid}")
else:
    r = requests.post(
        f"{URL}/rest/v1/gmp_staff",
        headers={**H, "Prefer": "return=representation"},
        json={
            "user_id": user_id,
            "full_name": "Tomasz Niedźwiecki",
            "email": ADMIN_EMAIL,
            "role": "admin",
            "color": "#3b82f6",
            "aliases": ["Tomek", "Tomasz"],
        }
    )
    if r.status_code < 300:
        print(f"  Nowy staff: {r.json()[0]['id']}")
    else:
        print(f"  BLAD staff: {r.text}")

print("\n=== 3. Tworze Storage bucket 'documents' ===")
r = requests.post(
    f"{URL}/storage/v1/bucket",
    headers=H,
    json={"name": "documents", "public": False}
)
if r.status_code == 200 or r.status_code == 201:
    print("  OK stworzone")
elif r.status_code == 409 or (r.status_code == 400 and "already" in r.text.lower()):
    print("  Istnieje")
else:
    print(f"  BLAD: {r.status_code} {r.text}")

print("\n=== GOTOWE ===")
print(f"Login: {ADMIN_EMAIL}")
print(f"Haslo: {ADMIN_PASSWORD}")
print(f"URL:   https://gfwsdrbywgmceateubyq.supabase.co (kod CRM: /crm/index.html)")

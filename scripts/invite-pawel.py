"""
Jednorazowy skrypt: zaprasza Pawła (owner) do CRM
- Tworzy auth user jeśli nie istnieje
- Linkuje do istniejącego gmp_staff record (który już ma rolę 'owner')
- Wysyła magic link / password reset email
"""
import os, sys, requests
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

URL = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

email = "p.stachurski@adwokaci-sg.pl"

# 1. Sprawdź czy auth user istnieje
r = requests.get(f"{URL}/auth/v1/admin/users?email={email}", headers=H)
users = r.json().get('users', [])
user = next((u for u in users if u.get('email', '').lower() == email.lower()), None)

if user:
    user_id = user['id']
    print(f"[auth] Paweł juz ma konto auth: {user_id[:8]}... (confirmed: {bool(user.get('email_confirmed_at'))})")
else:
    # Tworzymy z email_confirm=True żeby mógł się zalogować od razu po ustawieniu hasła
    r = requests.post(f"{URL}/auth/v1/admin/users", headers=H, json={
        "email": email,
        "email_confirm": True,
        "user_metadata": {"full_name": "Paweł Stachurski", "role": "owner"},
    })
    if r.status_code >= 300:
        print(f"[auth] BLAD: {r.status_code} {r.text}")
        sys.exit(1)
    user = r.json()
    user_id = user.get('id') or user.get('user', {}).get('id')
    print(f"[auth] Utworzono konto auth: {user_id[:8]}...")

# 2. Patch gmp_staff.user_id (rekord juz istnieje z rolą 'owner')
r = requests.patch(
    f"{URL}/rest/v1/gmp_staff?email=eq.{email}",
    headers={**H, "Prefer": "return=representation"},
    json={"user_id": user_id},
)
if r.ok and r.json():
    s = r.json()[0]
    print(f"[staff] Zlinkowano user_id: {s['id'][:8]}... rola={s['role']} full_name={s['full_name']}")
else:
    print(f"[staff] BLAD patch: {r.status_code} {r.text}")
    sys.exit(1)

# 3. Wyślij password recovery email - Paweł dostanie link do ustawienia hasła
r = requests.post(
    f"{URL}/auth/v1/recover",
    headers={"apikey": KEY, "Content-Type": "application/json"},
    json={"email": email},
)
print(f"[recover] Wyslano reset link na {email} (HTTP {r.status_code})")
print()
print("GOTOWE.")
print()
print("Pawel otrzyma email z linkiem 'Set your password' (tytul: 'Reset your password').")
print("Po ustawieniu hasla:")
print(f"  1. Zaloguje sie na https://crm.getmypermit.pl")
print(f"  2. W sidebar zobaczy nowa sekcje 'SUPER ADMIN'")
print(f"  3. Klik -> https://crm.getmypermit.pl/admin.html")

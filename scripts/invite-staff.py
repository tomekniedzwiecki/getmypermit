"""
Zaprasza pracownika do CRM:
1. Jeśli rekord gmp_staff istnieje (po nazwie) - uzupełnia email
2. Tworzy konto w auth.users (bez hasła - klient dostanie magic link)
3. Linkuje user_id -> gmp_staff
4. Wysyła email z zaproszeniem (Supabase invite)

Użycie:
    python invite-staff.py <email> [--name "Imię Nazwisko"] [--role admin|staff]
    python invite-staff.py pawel@example.pl --name "Paweł" --role admin
"""
import os, sys, argparse, requests
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

URL = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

parser = argparse.ArgumentParser()
parser.add_argument("email")
parser.add_argument("--name", default=None)
parser.add_argument("--role", default="staff", choices=["admin", "staff", "partner"])
args = parser.parse_args()

email = args.email.strip().lower()

# 1. Sprawdz czy istnieje auth user
r = requests.get(f"{URL}/auth/v1/admin/users", headers=H)
users = r.json().get('users', [])
existing_auth = next((u for u in users if u.get('email') == email), None)

if existing_auth:
    user_id = existing_auth['id']
    print(f"[auth] Użytkownik {email} juz istnieje (id={user_id[:8]})")
else:
    # Invite = tworzenie bez hasła + email z linkiem
    r = requests.post(f"{URL}/auth/v1/admin/invite", headers=H, json={
        "email": email,
        "data": {"role": args.role, "full_name": args.name or email.split('@')[0]},
    })
    if r.status_code >= 300:
        # Fallback: utwórz bez hasła z email_confirm=false, user dostanie magic link po forgot password
        r = requests.post(f"{URL}/auth/v1/admin/users", headers=H, json={
            "email": email,
            "email_confirm": True,
            "user_metadata": {"role": args.role, "full_name": args.name or email.split('@')[0]},
        })
        if r.status_code >= 300:
            print(f"[auth] BLAD tworzenia: {r.status_code} {r.text}")
            sys.exit(1)
    user = r.json() if r.json() else {}
    user_id = user.get('user', {}).get('id') or user.get('id')
    print(f"[auth] Utworzono konto: {user_id}")

# 2. Link do gmp_staff
# Szukaj po imieniu albo po istniejącym emailu
find_params = f"or=(email.eq.{email},full_name.ilike.%{args.name or email.split('@')[0]}%)"
r = requests.get(f"{URL}/rest/v1/gmp_staff?{find_params}&limit=1", headers=H)
matches = r.json()

if matches:
    sid = matches[0]['id']
    r = requests.patch(
        f"{URL}/rest/v1/gmp_staff?id=eq.{sid}",
        headers={**H, "Prefer": "return=minimal"},
        json={"user_id": user_id, "email": email, "role": args.role},
    )
    print(f"[staff] Linkuje user_id -> {matches[0]['full_name']} ({sid[:8]})")
else:
    r = requests.post(f"{URL}/rest/v1/gmp_staff", headers={**H, "Prefer": "return=representation"}, json={
        "user_id": user_id,
        "full_name": args.name or email.split('@')[0],
        "email": email,
        "role": args.role,
    })
    print(f"[staff] Nowy rekord: {r.json()[0]['id'][:8] if r.ok else 'BLAD'}")

# 3. Wyslij password reset (wygodne dla nowego usera - nie musza sie domyslic 'magic link')
r = requests.post(
    f"{URL}/auth/v1/recover",
    headers={"apikey": KEY, "Content-Type": "application/json"},
    json={"email": email, "options": {"redirectTo": f"{URL.replace('supabase.co', 'vercel.app').split('//')[0] + '//' + 'gfwsdrbywgmceateubyq.supabase.co'}/crm/reset-password.html"}},
)
print(f"[recover] Wyslano reset link na {email} (status {r.status_code})")
print()
print("GOTOWE. User dostanie email z linkiem do ustawienia hasla.")
print("Jesli nie dostanie - moze uzyc 'Nie pamietam hasla' na stronie logowania.")

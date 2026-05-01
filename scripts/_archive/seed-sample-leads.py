"""
Wstawia 10 przykładowych leadów pokazujących różne scenariusze pipeline.
"""
import os, psycopg
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv(Path(__file__).parent.parent / ".env")

REF = os.environ["SUPABASE_PROJECT_REF"]
PWD = os.environ["SUPABASE_DB_PASSWORD"]

NOW = datetime.now()

# 10 scenariuszy pokrywajacych roznorodne sytuacje z wytycznych
LEADS = [
    # 1. HOT - brak odcisków, Wrocław, gotowy do dzialania (idealny klient z wytycznych)
    {"first_name": "Rajesh", "last_name": "Kumar", "name": "Rajesh Kumar", "phone": "+48 501 234 567", "email": "r.kumar@gmail.com",
     "details": "I submitted my application 18 months ago and still waiting for fingerprints appointment. I don't know what to do. I need professional help urgently.",
     "situation": "no-fingerprints", "location": "wroclaw", "intent": "hire-lawyer", "permit_type": "temporary",
     "waiting_time": "18+", "lead_score": 90, "lead_type": "HOT", "status": "new", "language": "en",
     "utm_source": "google", "utm_medium": "cpc", "utm_campaign": "fingerprints_wroclaw",
     "created_offset_hrs": 2},

    # 2. HOT - wezwanie z urzędu, Wrocław
    {"first_name": "Maria", "last_name": "García", "name": "Maria García", "phone": "+48 602 345 678", "email": "maria.garcia@email.com",
     "details": "Recibí una carta del voivodato pidiendo documentos adicionales. No entiendo qué tengo que hacer. Necesito ayuda urgente.",
     "situation": "letter", "location": "wroclaw", "intent": "ready", "permit_type": "permanent",
     "rejection_timing": "0-7", "lead_score": 75, "lead_type": "HOT", "status": "contacted", "language": "es",
     "utm_source": "facebook", "utm_medium": "social",
     "created_offset_hrs": 26, "last_contact_offset_hrs": 3},

    # 3. WARM - sprawa stoi, Dolnośląskie
    {"first_name": "Chen", "last_name": "Wei", "name": "Chen Wei", "phone": "+48 603 456 789", "email": "chen.wei@outlook.com",
     "details": "My case has been pending for 14 months. Office in Wrocław doesn't respond to my emails. I think I need a lawyer.",
     "situation": "stuck", "location": "dolnoslaskie", "intent": "hire-lawyer", "permit_type": "temporary",
     "waiting_time": "12-18", "lead_score": 60, "lead_type": "WARM", "status": "contacted", "language": "en",
     "utm_source": "direct",
     "created_offset_hrs": 48, "last_contact_offset_hrs": 20},

    # 4. WARM - nowa sprawa, Wrocław, qualified
    {"first_name": "Ana", "last_name": "Silva", "name": "Ana Silva", "phone": "+48 604 567 890", "email": "ana.silva@yahoo.com",
     "details": "Moving to Wrocław in 2 months for work. Need to apply for TRC for me and my husband. Want to do it properly with a lawyer from the start.",
     "situation": "new", "location": "wroclaw", "intent": "hire-lawyer", "permit_type": "temporary",
     "lead_score": 55, "lead_type": "WARM", "status": "qualified", "language": "en",
     "utm_source": "google", "utm_medium": "organic",
     "created_offset_hrs": 72, "last_contact_offset_hrs": 48},

    # 5. HOT - odrzucony wniosek, pilne (0-7 dni na odwolanie)
    {"first_name": "Ahmed", "last_name": "Hassan", "name": "Ahmed Hassan", "phone": "+48 605 678 901", "email": "a.hassan@mail.com",
     "details": "My application was rejected last week. I need to appeal within 14 days. This is urgent!",
     "situation": "rejected", "location": "wroclaw", "intent": "ready", "permit_type": "temporary",
     "rejection_timing": "0-7", "lead_score": 85, "lead_type": "HOT", "status": "qualified", "language": "en",
     "utm_source": "referral",
     "created_offset_hrs": 96, "last_contact_offset_hrs": 70},

    # 6. WARM - oferta wyslana
    {"first_name": "Olena", "last_name": "Kovalenko", "name": "Olena Kovalenko", "phone": "+48 606 789 012", "email": "o.kovalenko@gmail.com",
     "details": "Prowadzę spółkę we Wrocławiu. Chcę otrzymać pobyt stały - już mieszkam w Polsce 6 lat.",
     "situation": "new", "location": "wroclaw", "intent": "hire-lawyer", "permit_type": "permanent",
     "lead_score": 50, "lead_type": "WARM", "status": "proposal", "language": "pl",
     "utm_source": "google", "utm_medium": "cpc",
     "created_offset_hrs": 120, "last_contact_offset_hrs": 24},

    # 7. WON - już skonwertowany (pokazać że działa)
    {"first_name": "Priya", "last_name": "Sharma", "name": "Priya Sharma", "phone": "+48 607 890 123", "email": "priya.sharma@gmail.com",
     "details": "IT professional, need TRC + work permit. Company in Wrocław wants to hire me.",
     "situation": "new", "location": "wroclaw", "intent": "ready", "permit_type": "work",
     "lead_score": 70, "lead_type": "HOT", "status": "won", "language": "en",
     "utm_source": "linkedin",
     "created_offset_hrs": 240, "last_contact_offset_hrs": 168,
     "converted_offset_hrs": 120},

    # 8. DISQUALIFIED - poza regionem (z wytycznych: brak zwiazku z woj. dolnoslaskim = dyskwalifikacja)
    {"first_name": "Juan", "last_name": "Rodriguez", "name": "Juan Rodriguez", "phone": "+48 608 901 234", "email": "juan.rod@mail.com",
     "details": "I live in Warsaw. Can you help me with my TRC application?",
     "situation": "new", "location": "other", "intent": "hire-lawyer", "permit_type": "temporary",
     "lead_score": 20, "lead_type": "COLD", "status": "disqualified", "language": "en",
     "dq_reason": "poza_regionem",
     "created_offset_hrs": 150, "last_contact_offset_hrs": 144},

    # 9. DISQUALIFIED - "tylko zapytac" (z wytycznych: pytacz = dyskwalifikacja)
    {"first_name": "Tomas", "last_name": "Novak", "name": "Tomas Novak", "phone": "+48 609 012 345", "email": "tomas@email.cz",
     "details": "Just asking - what are the requirements for TRC? I'm not sure if I'll apply.",
     "situation": "new", "location": "wroclaw", "intent": "just-info", "permit_type": "temporary",
     "lead_score": 15, "lead_type": "COLD", "status": "disqualified", "language": "en",
     "dq_reason": "tylko_info",
     "created_offset_hrs": 300, "last_contact_offset_hrs": 290},

    # 10. LOST - brak odpowiedzi (2 tygodnie bez kontaktu)
    {"first_name": "Daniela", "last_name": "Romano", "name": "Daniela Romano", "phone": "+48 610 123 456", "email": "d.romano@gmail.com",
     "details": "Interested in obtaining permanent residence. I've been in Poland 5 years.",
     "situation": "new", "location": "wroclaw", "intent": "hire-lawyer", "permit_type": "permanent",
     "lead_score": 45, "lead_type": "WARM", "status": "lost", "language": "en",
     "dq_reason": "brak_kontaktu",
     "created_offset_hrs": 336, "last_contact_offset_hrs": 168},
]

conn = psycopg.connect(host="aws-0-eu-west-1.pooler.supabase.com", port=5432,
                      user=f"postgres.{REF}", password=PWD, dbname="postgres", sslmode="require")

with conn.cursor() as cur:
    # Wyczysc istniejace sample po email (aby nie duplikowac)
    emails = [l["email"] for l in LEADS]
    cur.execute("DELETE FROM permit_leads WHERE email = ANY(%s)", (emails,))
    print(f"Removed {cur.rowcount} old samples")

    for l in LEADS:
        created_at = NOW - timedelta(hours=l["created_offset_hrs"])
        last_contact = NOW - timedelta(hours=l["last_contact_offset_hrs"]) if "last_contact_offset_hrs" in l else None
        converted_at = NOW - timedelta(hours=l["converted_offset_hrs"]) if "converted_offset_hrs" in l else None

        cur.execute("""
            INSERT INTO permit_leads (
                first_name, last_name, name, phone, email, details,
                situation, location, intent, permit_type, waiting_time, rejection_timing,
                lead_score, lead_type, status, language,
                utm_source, utm_medium, utm_campaign,
                created_at, last_contact_at, converted_at,
                disqualification_reason
            ) VALUES (%s,%s,%s,%s,%s,%s, %s,%s,%s,%s,%s,%s, %s,%s,%s,%s, %s,%s,%s, %s,%s,%s, %s)
        """, (
            l["first_name"], l["last_name"], l["name"], l["phone"], l["email"], l["details"],
            l["situation"], l["location"], l["intent"], l["permit_type"],
            l.get("waiting_time"), l.get("rejection_timing"),
            l["lead_score"], l["lead_type"], l["status"], l["language"],
            l.get("utm_source"), l.get("utm_medium"), l.get("utm_campaign"),
            created_at, last_contact, converted_at,
            l.get("dq_reason"),
        ))

    conn.commit()

    # Verify
    cur.execute("SELECT status, COUNT(*) FROM permit_leads GROUP BY status ORDER BY 2 DESC")
    print("\nStatusy po seedzie:")
    for r in cur.fetchall():
        print(f"  {r[0]}: {r[1]}")

    cur.execute("SELECT COUNT(*) FROM permit_leads")
    print(f"Total: {cur.fetchone()[0]}")

conn.close()
print("\nOK - 10 sample leadow dodanych")

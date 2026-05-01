# supabase/_archive/

Stare migracje SQL już zaaplikowane na produkcji, zachowane dla historii.

## Pliki

- `initial_permit_leads.sql` — pierwsza migracja projektu (kwiecień 2026):
  utworzenie tabeli `permit_leads` dla landing page getmypermit.pl.
  Zaaplikowana ręcznie w Supabase SQL Editor, przed wprowadzeniem
  systemu wersjonowania migracji w `supabase/migrations/`.

## Zasada

Aktywne migracje są w `supabase/migrations/` z timestampami `YYYYMMDD_NN_*.sql`.
Tu trafiają tylko pliki sprzed rozpoczęcia systematycznego procesu
migracji (Etap 0.5 — kwiecień 2026).

# GetMyPermit - Lista kontrolna i plan usprawnien

## Stworzone pliki

| Plik | Status | Funkcje |
|------|--------|---------|
| `lawyers.html` | Gotowy | CRUD prawnikow, kolory, role, specjalizacje |
| `calendar.html` | Gotowy | Widok miesiac/tydzien/dzien, typy wydarzen, filtr prawnikow |
| `offers.html` | Gotowy | Szablony ofert, etapy (milestones), ceny |
| `client-offer.html` | Gotowy | Publiczny podglad oferty, akceptacja, tracking wyswietl |
| `lead.html` | Zmodyfikowany | + przypisanie prawnika, + zakladka Oferty, + generowanie ofert |
| `admin.html` | Zmodyfikowany | + nawigacja (kalendarz, prawnicy, oferty), + filtr prawnikow |

## Baza danych (SQL juz wykonany)

- `gmp_lawyers` - prawnicy
- `gmp_calendar_events` - wydarzenia kalendarza
- `gmp_offers` - szablony ofert
- `gmp_client_offers` - oferty wyslane klientom
- `permit_leads.assigned_to` - przypisany prawnik (FK)
- `permit_leads.offer_id` - szablon oferty (FK)

---

## RUNDA 1: Podstawowa weryfikacja

### Do sprawdzenia:
- [x] Czy wszystkie pliki sie laduja bez bledow JS w konsoli?
- [x] Czy Supabase client jest poprawnie skonfigurowany we wszystkich plikach?
- [x] Czy auth redirect dziala (nieautoryzowany -> index.html)?
- [x] Czy prefix `gmp_` jest uzywany konsekwentnie?

### Zrealizowane ulepszenia (2026-04-12):
1. **client-offer.html** - dodano email verification, glass cards, expandable milestones, contact section
2. **admin.html** - dodano statystyki "Dzisiaj" (wydarzenia) i "Oferty" (pending)
3. Wszystkie linki zwrotne do admin.html są na miejscu

---

## RUNDA 2: Integracja z permit_leads

### Do sprawdzenia:
- [x] Czy lead.html poprawnie laduje liste prawnikow do dropdownu?
- [x] Czy zmiana prawnika zapisuje sie w bazie?
- [x] Czy oferty generuja sie z poprawnym tokenem?
- [x] Czy client-offer.html trackuje wyswietlenia?

### Status: ZWERYFIKOWANO (2026-04-12)
- TABLE_LAWYERS, TABLE_OFFERS, TABLE_CLIENT_OFFERS poprawnie zdefiniowane
- Wszystkie funkcje korzystają ze stałych TABLE_*

---

## RUNDA 3: Kalendarz - weryfikacja funkcji

### Do sprawdzenia:
- [ ] Tworzenie wydarzen
- [ ] Edycja wydarzen
- [ ] Usuwanie wydarzen
- [ ] Filtrowanie po prawniku
- [ ] Przechodzenie miedzy widokami (miesiac/tydzien/dzien)
- [ ] Wyszukiwanie leadow w modalu

### Potencjalne problemy:
1. calendar.html - sprawdzic JOIN z permit_leads (nazwy kolumn)
2. calendar.html - sprawdzic formatowanie daty dla widoku tygodnia

---

## RUNDA 4: Oferty - pelny flow

### Do sprawdzenia:
- [ ] Tworzenie szablonu oferty
- [ ] Dodawanie etapow (milestones)
- [ ] Ustawianie domyslnej oferty
- [ ] Generowanie linku dla klienta
- [ ] Podglad oferty przez klienta
- [ ] Akceptacja oferty

### Potencjalne problemy:
1. client-offer.html - sprawdzic czy JOIN z gmp_offers dziala
2. offers.html - sprawdzic walidacje milestones

---

## RUNDA 5: Admin panel - nawigacja i filtry

### Do sprawdzenia:
- [ ] Linki w sidebarze dzialaja
- [ ] Filtr prawnikow laduje opcje
- [ ] Filtrowanie leadow po prawniku dziala
- [ ] Style sa spojne z reszta UI

### Potencjalne problemy:
1. admin.html - sprawdzic czy loadLawyers() wykonuje sie po zalogowaniu

---

## RUNDA 6: Responsywnosc

### Do sprawdzenia:
- [ ] lawyers.html - widok mobilny
- [ ] calendar.html - widok mobilny
- [ ] offers.html - widok mobilny
- [ ] client-offer.html - widok mobilny
- [ ] lead.html - nowe sekcje na mobile

---

## RUNDA 7: UX i interakcje

### Do sprawdzenia:
- [ ] Toast notifications dzialaja
- [ ] Modal close (Escape, backdrop click)
- [ ] Loading states
- [ ] Error handling
- [ ] Potwierdzenia przed usunieciem

---

## RUNDA 8: Bezpieczenstwo

### Do sprawdzenia:
- [ ] escapeHtml() uzywany wszedzie gdzie renderujemy dane
- [ ] RLS policies sa poprawne
- [ ] Anon moze tylko czytac oferty (nie modyfikowac cen)
- [ ] Token oferty jest trudny do odgadniecia (UUID)

---

## RUNDA 9: Wydajnosc

### Do sprawdzenia:
- [ ] Indeksy SQL sa na wlasciwych kolumnach
- [ ] Niepotrzebne SELECT * zamienione na konkretne kolumny
- [ ] Debounce na wyszukiwaniu
- [ ] Lazy loading gdzie to mozliwe

---

## RUNDA 10: Dokumentacja i cleanup

### Do sprawdzenia:
- [ ] Aktualizacja IMPLEMENTATION_PLAN.md
- [ ] Usuniecie zbednych komentarzy
- [ ] Spojne nazewnictwo zmiennych
- [ ] Console.log tylko dla bledow

---

## Wykonaj te komendy aby sprawdzic:

```bash
# Sprawdz czy wszystkie pliki istnieja
ls -la getmypermit/*.html

# Sprawdz skladnie JS (podstawowe bledy)
grep -n "const TABLE_" getmypermit/*.html

# Sprawdz czy wszystkie pliki maja Supabase config
grep -l "SUPABASE_URL" getmypermit/*.html

# Sprawdz czy gmp_ prefix jest uzywany
grep -n "gmp_" getmypermit/*.html | head -20
```

---

## Nastepne kroki po kazdej rundzie:

1. Otworz kazdy plik w przegladarce
2. Sprawdz konsole pod katem bledow
3. Przetestuj glowne funkcje
4. Zapisz znalezione problemy
5. Napraw problemy
6. Przejdz do nastepnej rundy

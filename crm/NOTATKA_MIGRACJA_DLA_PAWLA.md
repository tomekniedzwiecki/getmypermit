# Migracja danych — stan i problem do rozstrzygnięcia

## Co zrobione (zgodnie z Twoimi uwagami 7–9)

| # | Akcja | Efekt |
|---|-------|-------|
| 7 | Usunięto 671 spraw z pliku `Ewidencja spotkań` | Spraw w bazie: 5077 → 4405 |
| 8 | Auto-status na podstawie opłat (z rozliczeń) | 1434 spraw przełączonych z `aktywna` → `zakonczona` (w pełni opłacone) |
| 9 | Sprawy z `SKŁADANE WNIOSKI` nie zostały w ogóle zaimportowane | — |

**Stan finalny po migracji:**

- Wszystkich spraw: **4405**
  - zakonczona: 3424
  - aktywna: 979
  - lead / zlecona: 2 (ręczne)

## Problem do rozstrzygnięcia: rozliczenia vs rejestr to dwa osobne zbiory

Mówiłeś: „sprawy aktywne i zakończone, **nadto połączenie ich z danymi z rozliczeń**". Technicznie sprawa wygląda tak:

**Co jest w bazie dzisiaj** (po migracji automatycznej z Twoich 2 plików):

- 3389 spraw z `rejestr_*` (Rejestr kart pobytu) — są tam **dane sprawy** (status, etap, kategoria, pracodawca, urząd), ale **0 płatności**
- 1613 spraw z `rozliczenia` (ROZLICZENIA xlsx) — są tam **płatności** (2234 wpłaty, 3,7 mln zł), ale dane sprawy są minimalne (imię/nazwisko, kwota, data)

**Problem:** rejestr i rozliczenia zostały zaimportowane jako niezależne sprawy. Klient „KOWALSKI JAN" mógł trafić do obu plików i teraz istnieje jako dwie osobne sprawy w CRM.

### Skala nakładania się (po zliczeniu per klient)

- **831 klientów** ma sprawy zarówno w rejestr, jak i w rozliczeniach — tu są duplikaty
- 717 klientów — tylko w rozliczeniach (pewnie sprawy spoza 2024)
- 1802 klientów — tylko w rejestr (brak danych o płatności albo zapłacono gotówką bez ewidencji)

### Opcje scalenia

1. **Zostawić jak jest** — każdy klient może mieć kilka spraw, pracownicy ręcznie zakładają nowe i pilnują kontekstu. Najmniej ryzyka, ale dwie sprawy tego samego klienta żyją obok siebie.
2. **Fuzzy matching nazwisk + dat** — zautomatyzowane scalenie 831 duplikatów. Ryzyko: pomyłki (KRAVCHUK IRINA vs KRAWCZUK IRYNA), trudne do cofnięcia.
3. **Oznaczyć ręcznie** — dodać w CRM przycisk „scal z inną sprawą"; Ty / zespół przechodzicie przez 831 par i decydujecie. Czasochłonne, ale deterministyczne.

**Moja rekomendacja:** opcja 3 lub zostawić jak jest na teraz, wrócić do tego jak oswoisz się z CRM-em.

## Co od Ciebie potrzeba

- Która opcja? Jeśli (3), to dodam narzędzie „scal duplikat" w karcie klienta — klikasz, widzisz kandydatów, decydujesz.
- Czy sprawy z `rozliczenia` mają mieć uzupełnione dane merytoryczne (etap, status szczegółowy, urząd) ręcznie przez zespół?

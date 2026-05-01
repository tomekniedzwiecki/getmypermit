# scripts/_archive/

Jednorazowe skrypty migracji + cleanupów już wykonane na produkcji.

Zachowane dla **historii** (audytowy ślad co kiedy zrobiono), nie do uruchomienia ponownego.

## Kategorie

### apply-*.py
Migracje SQL aplikowane na konkretne dni — zastąpione przez systematyczne `run_etap_*.mjs` w głównym `scripts/`.

### phase1-*.py / phase2-*.py / phase3-*.py
Wieloetapowe migracje danych z marca/kwietnia 2026 (import legacy data, dedup klientów, relink appointments).

### audit-pawel-2026-04-20.py / audit_section_1_4*.mjs
Stary audyt sprzed PAWEL_ROADMAP_v3.

### create_spike_template_*.py
Eksperymenty docx-templates z fazy Spike 0.5 (zakończone).

### cleanup-*.py / fix-*.py
Jednorazowe naprawy danych po importach.

### preview-pawel-data.py
Skrypt do przeglądania danych Pawła przed migracją.

### swap-keys.mjs
Jednorazowy rotation kluczy.

## Zasada

**Nie usuwaj** chyba że stara się latami nieaktywne. W razie potrzeby
ponownego uruchomienia najpierw przeczytaj kod, sprawdź czy wciąż
pasuje do aktualnego schematu.

# Email do Pawła — podsumowanie wdrożenia uwag z 2026-04-20

Poniżej gotowa treść do skopiowania w mailu. Ton profesjonalny, bez żargonu technicznego.

---

**Temat:** CRM getmypermit — zrealizowane uwagi z 2026-04-20, gotowe do pracy od poniedziałku

---

Pawle,

podsumowanie tego, co zostało wdrożone na podstawie Twoich uwag z niedzieli 2026-04-20. System (https://crm.getmypermit.pl) jest gotowy do produkcyjnej pracy od poniedziałku 2026-04-27.

## 1. Płatności

**Plan rat z osobnymi datami** (pkt 1.1) — każda rata ma własną datę. Przycisk „Generuj równomiernie" tworzy N rat z wybranego łącznego wynagrodzenia. Przycisk „Oznacz zapłaconą" przy każdej racie. Raty paid/pending/overdue mają różne kolory.

**Automatyczne zadania o ratach** (pkt 1.1) — codziennie rano (ok. 7:00) system sam tworzy zadanie dla opiekuna sprawy: „Płatność dziś: rata #X — Kowalski Jan, kwota Y zł". Opiekun widzi to w swoich zadaniach i dzwoni do klienta.

**4 kategorie opłat na karcie sprawy** (pkt 1.2, 1.3):
- Wynagrodzenie
- Opłata administracyjna
- Opłata skarbowa (NOWA)
- Założone za klienta (NOWA) — z wyszczególnionymi pozycjami (notariusz, polisa itp.) + statusem „Do zwrotu / Zwrócona"

Każda z 4 kategorii ma swój kafelek KPI w zakładce Finanse — pokazuje planowaną kwotę, wpłacone, zaległość, pasek postępu.

**Wprowadzanie ręczne** (pkt 1.4) — zgodnie z Twoją decyzją, żadnych integracji. Wszystkie wpłaty wprowadzasz ręcznie. Wszystkie zestawienia (staff, dashboard, alerty) aktualizują się na bieżąco.

**Zaległości w liście spraw zamiast kwoty wpłat** (pkt 1.5) — kolumna „Zaległość" z czerwoną kropką przy przeterminowanych ratach. Sortowalne.

## 2. Statusy

Bez zmian — zgodnie z Twoją decyzją.

## 3. Etapy — 6 nowych

Dodane: wezwanie, uzupełnienie dokumentów, przyspieszenie, wydłużenie terminu, przeniesienie z innego województwa, wniosek przeniesiony.

## 4. Tagi — 8 nowych

Czeka na przeniesienie, Czeka na dok. od pracodawcy, APT, OUTSOURCING, problematyczny, pretensje, brak reakcji urzędu, zaległości finansowe.

## 5. Kategorie — pełna lista 25 pozycji

Zastąpiłem starą krótką listę pełną listą z Twoich uwag, pogrupowaną:
- **Pobyt czasowy** (11): praca, inne urzędy, łączenie z rodziną, poza RP, łączenie z ob. RP, JDG UKR, JDG, spółka, blue card, konkubinat, studia
- **Pobyt stały** (4): małżeństwo, karta polaka, polskie pochodzenie, dziecko
- **Inne** (10): rezydent, obywatelstwo (nadanie + uznanie), zaproszenie, wymiana karty, zmiana decyzji, ochrona międzynarodowa, deportacja, transkrypcja, odwołanie

Dropdown na karcie sprawy i w filtrze pokazuje je w grupach.

## 6. Opiekunowie — dezaktywacja

Usunięci z aktywnej listy: Mateusz Lis, Olha Kovalova, konto testowe, Michał, Natalia. (Zachowani w bazie, żeby historyczne sprawy miały przypisanie — po prostu nie pojawiają się w dropdownach).

## 7. Oddziały

Usunięte: OCII, OCI, OBYWATELSTWO, DUE–rezydent. Dodane: PC 1, PC 2, PC 3, PC 4, OP — OBYWATELSTWO.

## 8. Lista spraw i karta sprawy — nowe pola

**W liście spraw** nowe kolumny:
- Data złożenia wniosku (po dacie przyjęcia)
- **Dni od przystąpienia** (z kolorami: >180 dni czerwone, >90 żółte)
- Koniec legalnego pobytu (z sortowaniem)
- Zaległość (zamiast kwoty wpłat)

**W karcie sprawy** nowe pola w danych szczegółowych:
- Data końca legalnego pobytu
- Gdzie to leży (lokalizacja teczki — pole tekstowe, jak prosiłeś, bez słownika)
- Sprawę przyjął/a (osobne pole, niezależne od opiekuna — raporty „kto ile zarabia" liczę po tej osobie, nie po opiekunie)
- Data przekazania opiekunowi (ustawiana automatycznie przy zmianie opiekuna)

**Wielu opiekunów (max 3)** — system 2-kowy:
- Opiekun główny (primary) + do 2 dodatkowych (secondary/backup)
- Dodawanie przez chipy „+ Dodaj opiekuna" w karcie sprawy
- Wszystkie istniejące sprawy mają już pierwszego opiekuna oznaczonego jako primary

## 9. Terminy i kalendarz

**Typy terminów** — dropdown w zadaniu: uzupełnienie braków formalnych, uzupełnienie dok. merytorycznych, osobiste stawiennictwo, rozmowa z klientem/pracodawcą, kontakt z urzędem, odbiór decyzji.

**Toggle „Pokaż w kalendarzu"** — każde zadanie może, ale nie musi być w kalendarzu. Bez spamowania wszystkim, jak prosiłeś.

**Zadania prywatne** — flaga „Prywatne", widoczne tylko dla autora.

**Kalendarz — „Tylko moje"** — przełącznik filtrujący tylko Twoje spotkania i zadania. Ustawienie zapamiętywane per użytkownik.

Zadania z włączonym „Pokaż w kalendarzu" pojawiają się jako żółte kafelki w widoku tygodniowym.

## 10. Zestawienia i wydajność pracowników

**Lista pracowników (staff.html)** zawiera teraz kolumny:
- Ile przyjął spraw
- Ile prowadzi (aktywnych / zakończonych / leadów)
- Przychód z przyjętych spraw
- **Zaległości finansowe** na prowadzonych sprawach (nowa kolumna)
- Ile zadań otwartych / ile zaległych

## 11. Alert „Brak reakcji pracodawcy"

Nowa sekcja w Alertach — pokazuje sprawy z tagiem „Czeka na dok. od pracodawcy" gdzie nie było aktywności od ponad 14 dni (po 30 dniach alert czerwony).

## 12. Ankieta klienta

**Rozszerzony zestaw pól** — dodałem wszystkie z Twojej listy:
- Imiona poprzednie, nazwisko panieńskie
- Imię ojca, imię matki, nazwisko panieńskie matki
- Miejsce urodzenia, kraj pochodzenia
- Stan cywilny, wzrost, kolor oczu, znaki szczególne / tatuaże
- Członkowie rodziny w Polsce (wiele wpisów)
- Profil zaufany (tak/nie/nie wiem)
- Pobyty poza PL w ostatnich 5 latach
- Rodzaj dokumentu na jakim wjechał + cel wizy UE
- Telefon i email pracodawcy

**Przycisk „Wypełnij z palca"** — otwiera duże okno z wszystkimi polami do wprowadzenia ręcznego. **Ważne:** dane zapisują się do tej samej ankiety co wersja elektroniczna. Jeśli klient później wypełni link, dane się nakładają naturalnie — nie trzeba prowadzić dwóch kopii.

**Zatwierdzanie dokumentów z ankiety** — pliki załączone przez klienta (paszport, umowa itp.) pojawiają się w zakładce Dokumenty w sekcji „Do zatwierdzenia z ankiety klienta". Pracownik klika „Zatwierdź" i dokument trafia do dokumentów sprawy.

## 13. Kalendarz — widok „tylko moje" + prywatne zadania

Zrealizowane wraz z pkt 9.

## 14. Kontakt z karty sprawy (tel/WhatsApp/email) — tylko opiekun

⏸ **Wstrzymane do otrzymania od Ciebie listy:** dla każdego aktywnego opiekuna potrzebuję nr telefonu + email. Po otrzymaniu danych — ok. 3 godziny pracy na podpięcie bramki.

## 15. Licznik dni od przystąpienia

Zrealizowane — osobna kolumna w liście spraw (punkt 8 powyżej).

## 16. Uprawnienia — pracownicy NIE widzą globalnych finansów

Zgodnie z Twoją decyzją:
- Pracownicy (role: staff, lawyer, assistant) **nie mają dostępu** do Analytics, Płatności, Windykacji (osobne ekrany).
- Na **Dashboardzie** nie widzą kafelków „Przychód miesiąca" i „Do odzyskania" oraz całej sekcji „Finanse" (wykres 12 miesięcy i struktura).
- Widzą tylko: aktywne sprawy, swoje zadania, swój kalendarz, alerty.
- Ty (owner) + admin + manager — widzicie wszystko.

## 17. Start 2026-04-27 ✅

System gotowy. Pomoc zaktualizowana o wszystkie nowe funkcje — zakładka „Pomoc" w CRM.

---

## Co jeszcze warto wiedzieć

**Pomoc wewnątrz CRM** zaktualizowana — wszystkie nowe funkcje mają opis (zakładka Pomoc w menu).

**Kopie bezpieczeństwa** — Supabase ma włączony Point-In-Time Recovery (odzyskanie bazy do dowolnego momentu w ciągu 7 ostatnich dni) + codzienne automatyczne backupy. Jeśli coś pójdzie nie tak, baza daje się cofnąć.

**Uruchomienie** — system działa pod adresem **https://crm.getmypermit.pl**. Po rozpoczęciu pracy w poniedziałek, proszę daj znać jeśli coś działa inaczej niż oczekujesz — poprawimy na żywo.

Pozdrawiam,
Tomek

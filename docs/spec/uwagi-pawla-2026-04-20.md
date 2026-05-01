# Uwagi Pawła — CRM getmypermit (2026-04-20)

> Notatki od Pawła po kilkugodzinnym przeglądzie systemu w większej grupie w kancelarii.
> Data zbiorcza: **2026-04-20**. Cel: od przyszłego poniedziałku (**2026-04-27**) wprowadzać sprawy do systemu i pracować tylko w nim.

---

## 1. PŁATNOŚCI

### 1.1 Plan płatności — ratalny z datami i alertami

Plan płatności ma być skonstruowany jako:
- **Rata 1** + wybór z kalendarza daty zapłaty
- **Rata 2** + wybór z kalendarza daty zapłaty
- **Rata 3** + wybór z kalendarza daty zapłaty
- **Rata 4** + wybór z kalendarza daty zapłaty
- (dowolna liczba rat)

**Alerty:** pracownik prowadzący sprawę w dniu zaplanowanej raty dostaje wpis w zadaniach „dziś konkretna osoba ma zapłacić X zł". Wówczas może skonfrontować z wpłatami i ewentualnie wysłać zapytanie o płatność.

### 1.2 Nowa kategoria opłaty — **opłata skarbowa**

Rodzaje płatności w karcie sprawy → zakładka **Finanse**:

1. **Wynagrodzenie**
2. **Opłata administracyjna**
3. **Opłata skarbowa** *(NOWE)*
4. **Założone za klienta** *(NOWE — opłaty do zwrotu)*

**Jak ma działać:**
- W danych szczegółowych sprawy są pola do wypełnienia: opłata administracyjna, opłata skarbowa.
- Jeżeli kancelaria będzie ponosić te opłaty — pracownik przyjmujący sprawę wpisuje kwoty.
- Klient zostawia pieniądze na tę opłatę → pracownik odznacza w systemie.
- Widoczne w przeglądzie sprawy i w finansach — na tych samych zasadach co wynagrodzenie.

### 1.3 Opłaty do zwrotu — „założone za klienta"

Rubryka **„Opłaty do zwrotu"** w Finansach:
- Sumuje kwoty opłat, które kancelaria poniosła w imieniu klienta (notariusz, polisa itp.).
- Klient nam te pieniądze zwraca.
- **Osobne okienko na dole strony**, pomiędzy *Plan płatności* a *Historia wpłat*, z wyszczególnieniem jakie opłaty ponieśliśmy za klienta.
- **2 dodatkowe kafelki** obok wynagrodzenia / opłat administracyjnych / opłat skarbowych — dotyczące opłat za klienta.

### 1.4 Wprowadzanie rozliczeń — ręcznie, bez synchronizacji

Paweł zdecydował, że **wszystkie rozliczenia wprowadza ręcznie** — żadnej synchronizacji z zewnętrznymi systemami. Poświęci weekend i wprowadzi wszystko.

Zatem:
- Przywróć funkcjonalności windykacyjne i rozliczeniowe z poprzedniej wersji.
- Wszystkie narzędzia podsumowujące (finanse, zobowiązania, windykacja) mają weryfikować dane na bieżąco — w miarę jak Paweł wprowadza rozliczenia.
- Zestawienia: kto i za ile przyjmuje sprawę, ile zalega, itd.

### 1.5 Ogólny spis spraw — zaległości zamiast wpłat

W liście spraw obecnie jest widoczna kwota, jaką klient zapłacił.
**Zamień:** w tym miejscu ma się wyświetlać **kwota zaległości** — żeby było jasne, kto ile zalega.
**Minimum:** **czerwona kropka** oznaczająca zaległość.

---

## 2. STATUSY

**Bez zastrzeżeń.** Zostają jak są.

---

## 3. ETAPY — dodać nowe

Obecne etapy zostają, **dodać**:
- wezwanie
- uzupełnienie dokumentów
- przyspieszenie
- wydłużenie terminu
- przeniesienie z innego województwa
- wniosek przeniesiony

---

## 4. TAGI — dodać nowe

- Czeka na przeniesienie
- Czeka na dok. od pracodawcy
- APT
- OUTSOURCING
- Problematyczny
- Pretensje
- Brak reakcji urzędu
- Zaległości finansowe

---

## 5. KATEGORIE — pełna lista (zastąpić obecną)

### Pobyt czasowy
- pobyt — praca
- pobyt — inne urzędy
- pobyt — łączenie z rodziną
- pobyt — poza RP
- pobyt — łączenie z ob. RP
- pobyt — JDG UKR
- pobyt — JDG
- pobyt — spółka
- pobyt — blue card
- pobyt — konkubinat
- pobyt — studia

### Pobyt stały
- pobyt stały — małżeństwo
- pobyt stały — karta polaka
- pobyt stały — polskie pochodzenie
- pobyt stały — dziecko

### Inne
- rezydent
- obywatelstwo — nadanie
- obywatelstwo — uznanie
- zaproszenie
- wymiana karty
- zmiana decyzji
- ochrona międzynarodowa
- deportacja
- transkrypcja
- odwołanie

---

## 6. OPIEKUN — wyczyścić listę

**Usunąć** z listy opiekunów:
- Mateusz Lis
- Olha Kovalova
- konto testowe
- Michał
- Natalia

---

## 7. ODDZIAŁY — uporządkować

**Usunąć:**
- OCII
- OCI
- OBYWATELSTWO
- DUE → usunąć rezydent

**Zostawić / dodać:**
- PC 1
- PC 2
- PC 3
- PC 4
- OP — OBYWATELSTWO

---

## 8. LISTA SPRAW — dodatkowe kolumny / funkcje

- **Data złożenia wniosku** po dacie przyjęcia w spisie „Sprawy"
- **Data zakończenia legalnego pobytu** — w danych szczegółowych + jako pole sortowania w kolejce wniosku *(pomysł Karol M. + Michał K.)*
- **„Gdzie to leży"** — nowe pole w danych szczegółowych (tekstowe, bez słownika — do opracowania)
- **Osoba przyjmująca sprawę** — osobne pole, niezależne od opiekuna. Paweł przyjmuje sprawy, potem dekretuje. Lista jak u opiekunów (po aktualizacji). Podsumowania „kto ile zarabia dla kancelarii" liczone po osobie przyjmującej, nie opiekunie.
- **Data przekazania sprawy opiekunowi** — w danych szczegółowych
- **Kilku opiekunów sprawy — max 3.** Nie chodzi o edycję (system 2-kowy: każda sprawa ma ≥ 2 osoby, żeby wykluczyć przestoje przy chorobach/urlopach).

---

## 9. TERMINY — nowe typy + kontrola widoczności w kalendarzu

**Dodać typy terminów:**
- uzupełnienie braków formalnych
- uzupełnienie dokumentów merytorycznych
- osobiste stawiennictwo

**Nowa funkcjonalność:** przy KAŻDEJ czynności z wyborem daty — **toggle „pokazać w kalendarzu / tylko w zadaniach pracownika"**. Bez spamowania wszystkim kalendarza.

---

## 10. ZESTAWIENIA I WYDAJNOŚĆ PRACOWNIKÓW

Paweł (admin) chce widzieć:
- Lista zadań konkretnego opiekuna
- Zbiorcze zestawienie: kto ile ma zadań w danym miesiącu
- Kto jakie i kiedy zadanie wykonał
- Kto jakie sprawy przyjął i za ile
- Kto jakie sprawy prowadzi (opiekun)
- Efektywność pracy konkretnych osób
- Wszelkie zestawienia globalne, wydajność, ilość spraw zalegających, zaległości w sprawach konkretnych opiekunów

**Separacja uprawnień (wymóg):**
- Pracownicy **NIE widzą** ogólnych podsumowań przychodów do kancelarii.
- Pracownik widzi tylko z perspektywy swojego konta: zaległości w sprawach, które prowadzi.
- Globalne zestawienia — tylko Paweł.

---

## 11. DASHBOARD — alerty bezczynności

**Dodać alert:** „Brak reakcji pracodawcy" *(pomysł Julki — sytuacja z Panią Ludmiłą).*

---

## 12. ANKIETA KLIENTA — wypełnianie z palca + elektroniczna

### 12.1 Z palca w karcie sprawy (nowa zakładka ankieta)

Wymagane pola:
- Imię
- Imiona poprzednie
- Nazwisko
- Nazwisko panieńskie
- Imię ojca
- Imię matki
- Nazwisko panieńskie matki
- Data urodzenia
- Miejsce urodzenia
- Kraj pochodzenia
- Obywatelstwo
- Wzrost
- Kolor oczu
- Znaki szczególne / tatuaże — gdzie?
- Stan cywilny
- **Członkowie rodziny w Polsce** (imię, nazwisko, data urodzenia, miejscowość zamieszkania, czy na utrzymaniu cudzoziemca, czy ubiega się o pobyt w PL) — wiele rekordów
- Data ostatniego wjazdu do PL
- Rodzaj dokumentu na jakim wjechał do PL — wybór: karta pobytu / wiza / ruch bezwizowy / inny (jaki)
  - jeżeli wiza z innego kraju UE — jaki cel pobytu
- Pobyty poza PL w okresie ostatnich 5 lat
- Miejsce zamieszkania w Polsce
- Pracodawca: nr tel, email
- Nr tel. cudzoziemca
- Email cudzoziemca
- Czy ma profil zaufany

### 12.2 Ankieta elektroniczna (link do klienta)

- Ten sam zestaw pól jest wskazówką do ankiety wirtualnej wysyłanej klientowi linkiem.
- **Pytanie do Claude:** czy wypełnienie elektroniczne może automatycznie wypełniać ankietę „z palca" w CRM? Czy ma się pojawić osobne zestawienie w zakładce? — decyzja wg uznania, ważne żeby był dostęp.
- **Zdjęcia / dokumenty** załączone przez klienta w ankiecie elektronicznej — automatycznie ląduje w zakładce **Dokumenty**.

---

## 13. KALENDARZ

- **Domyślnie wszyscy widzą wszystko w kalendarzu.** Dana osoba może przełączyć widok na „tylko moje" (swoje rozmowy/spotkania).
- **Zadanie prywatne** — możliwość wprowadzenia wydarzenia niewidocznego dla innych.

---

## 14. KONTAKT Z KLIENTEM Z KARTY SPRAWY — tylko opiekun

Kontakt w sprawie (WhatsApp / telefon / email) z karty sprawy — **tylko dla opiekuna tej sprawy**.

Model:
- Każdy opiekun ma email.
- Telefon: co do zasady 1 tel. na 2-óbkę (Paweł poda dane).
- Jeżeli opiekun jest zalogowany → może wykonać telefon lub wysłać wiadomość z karty sprawy.
- Wszystkie akcje widoczne w **historii sprawy** — który opiekun to zrobił.

**Paweł oczekuje od Claude:** listy danych potrzebnych do uruchomienia (nr tel., emaile konkretnych opiekunów). Paweł dokładnie opisze i prześle.

---

## 15. LICZNIK DNI

Obecnie widać liczbę dni od złożenia wniosku.
**Dodać:** liczba dni **od przystąpienia do sprawy** (pole „data przystąpienia" w danych szczegółowych, np. 20.04.2026).

---

## 16. UPRAWNIENIA — separacja admin / pracownik

Patrz również pkt 10.

Paweł:
- globalne zestawienia
- przychody kancelarii
- wydajność pracowników
- zaległości globalne
- ilość zaległości w sprawach konkretnych opiekunów
- wszystkie podsumowania sugerowane przez Claude z jego doświadczenia

Pracownicy:
- tylko to, co dotyczy ich kont i ich spraw
- zaległości w sprawach, które prowadzą

---

## 17. DEADLINE

**Od poniedziałku 2026-04-27** Paweł zaczyna wprowadzać sprawy i pracować tylko w tym systemie.

---

## Lista pytań od Claude do Pawła

1. Dane kontaktowe opiekunów — potrzebne do sekcji **14** (kontakt z karty sprawy). Format: nr telefonu + email dla każdego opiekuna.
2. Czy **PC 1-4** (pkt 7) to rzeczywiste oddziały urzędów, czy wewnętrzne zespoły kancelarii?
3. Czy „data zakończenia legalnego pobytu" (pkt 8) pochodzi z karty pobytu / wizy — czy liczona automatycznie?
4. Dla rat (pkt 1.1) — czy rata może mieć status „przypomnienie wysłane" / „opóźniona"?
5. Czy „opłaty za klienta" (pkt 1.3) mają mieć osobny plan zwrotu, czy to zawsze jednorazowe?

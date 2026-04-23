# Brief dla Claude Coworker — Konfiguracja kampanii Google Ads PMax (GetMyPermit)

**Czas zadania:** ~60 minut wyklikania w Google Ads UI
**Status końcowy wymagany:** **PAUSED** (nie uruchamiaj — czekamy na akceptację klienta przed startem 2026-04-26)
**Cel:** Zebrać najwyższej jakości leady od cudzoziemców potrzebujących profesjonalnej pomocy prawnej w sprawach pobytowych w woj. dolnośląskim.

---

## 0. Kontekst — przeczytaj zanim zaczniesz

**Klient:** getmypermit.pl — kancelaria imigracyjna we Wrocławiu, 11 prawników, 10 000+ klientów, 4.9★ Google.

**Produkt:** Przejęcie sprawy pobytowej od A do Z — MOS 2.0, karta pobytu, obywatelstwo, odwołania od odmów.

**Grupa docelowa:** Cudzoziemcy 22-50 lat w woj. dolnośląskim (Ukraina, Indie, Nepal, Chiny, Bangladesz, Indonezja, Korea, Meksyk, Kolumbia) posługujący się angielskim.

**KLUCZOWE dla jakości leadów:**
- Kancelaria obsługuje **WYŁĄCZNIE województwo dolnośląskie** — leady z Warszawy/Krakowa są dyskwalifikowane i pali budżet
- **NIE chcemy "pytaczy"** szukających darmowej porady — tylko klientów gotowych na płatną usługę
- Lead form ma **value-based scoring** (COLD 10 PLN / WARM 60 PLN / HOT 200 PLN) — Google uczy się bidować na wysokiej wartości
- Cudzoziemcy z Polski najczęściej nie znają polskiego, **angielski to lingua franca** — kampania tylko w EN

**Tracking już aktywny:**
- GTM: `GTM-P8ZD3B58`
- GA4: `G-5W9YPERVSK`
- Google Ads Conversion ID: `AW-17886093904`
- Primary conversion: **Lead Submit** (label `BftACPn33aAcENDE4NBC`, value-based)
- Secondary: **Lead Form Start** (label `fcLiCPTe3qAcENDE4NBC`, bez wartości)

---

## 1. Zaloguj się i stwórz kampanię

1. Otwórz https://ads.google.com (sprawdź że jesteś na koncie klienta GetMyPermit)
2. Kliknij **+ Nowa kampania**
3. Cel: **Potencjalni klienci (Leads)**
4. Konwersje do optymalizacji:
   - ✅ **GMP - Lead Submit** (primary, value-based) — MUSI być zaznaczone
   - ✅ **GMP - Lead Form Start** (secondary, bez wartości) — zaznaczone ale jako „Other"
5. Typ kampanii: **Performance Max**
6. Nazwa kampanii: `GMP - PMax - Dolny Slask - EN`

---

## 2. Strategia bidding i budżet

| Pole | Wartość | Dlaczego |
|---|---|---|
| Strategia | **Maksymalizuj konwersje** (bez tCPA) | Pierwsze 3-4 tygodnie zbieramy dane — tCPA ustawimy później |
| Budżet dzienny | **150 PLN** | Minimum dla PMax żeby algo się uczył (potrzebuje ~20-30 konwersji/mies.) |
| Waluta | **PLN** | — |
| Use customer value data | **ON (włącz)** | Kluczowe — konwersje mają wartości 10/60/200 PLN |

**NIE ustawiaj tROAS na start** — zostaw "Maximize conversions" bez target. Po 4 tyg. gdy zbierzemy dane, przełączymy na tCPA i dopiero potem na tROAS.

---

## 3. Geografia (KRYTYCZNE dla jakości leadów)

**Targetuj TYLKO:**
- **Województwo dolnośląskie** (Polska) — location ID: `21148`
- Dodatkowe miasta (overlap gdyby): Wrocław, Legnica, Wałbrzych, Jelenia Góra, Bolesławiec

**Ustawienia lokalizacji:**
- Presence/Interest: ✅ **"People in or regularly in your targeted locations"** (NIE „People in or interested in" — to przyciąga użytkowników spoza)

**Wyklucz:** wszystkie inne województwa i kraje (pozostaw default — Google wykluczy automatycznie przy targetowaniu po województwie)

**Sanity check:** po zapisaniu, w preview powinno być napisane coś jak "Targeting: Dolnośląskie Voivodeship, Poland — estimated reach 200k-400k people".

---

## 4. Języki

Włącz **TYLKO**: **English** (Angielski)

Wyłącz wszystkie inne (w tym polski, ukraiński, rosyjski — celujemy w cudzoziemców używających EN jako lingua franca). Landing getmypermit.pl ma auto-detect języka więc ukraiński/rosyjski browser i tak dostanie odpowiednią wersję.

---

## 5. Harmonogram

- **Data startu:** ustaw na `2026-04-26` (poniedziałek)
- **Data końca:** brak (bez końca)
- **Dni tygodnia:** wszystkie
- **Godziny:** całodobowo (Google auto-optymalizuje)

---

## 6. Asset Group — stwórz jedną grupę

**Nazwa:** `GMP - EN Core`
**Final URL:** `https://getmypermit.pl/`
**Display path:** `/residence-permit` + `/wroclaw` (pomocne dla SERP relevance)

### 6.1 Images — wgraj z lokalnego folderu

Lokalizacja plików: `c:/repos_tn/getmypermit/img/ads/manus/final/`

**Landscape 1200×628** (upload 15 plików):
```
gmp-img_01-mos2-solo-struggle-1200x628.jpg
gmp-img_02-takeover-relief-1200x628.jpg
gmp-img_03-fingerprint-delay-1200x628.jpg
gmp-img_04-refusal-letter-shock-1200x628.jpg  ⚠️ FLAG: ma godło RP — sprawdź czy chcesz wgrywać
gmp-img_05-team-authority-1200x628.jpg
gmp-img_06-decision-celebration-1200x628.jpg
gmp-img_07-mos2-system-interface-1200x628.jpg
gmp-img_08-trusted-profile-setup-1200x628.jpg
gmp-img_09-office-visit-prep-1200x628.jpg
gmp-img_10-remote-case-handling-1200x628.jpg
gmp-img_11-family-reunification-1200x628.jpg
gmp-img_12-permanent-residence-goal-1200x628.jpg
gmp-img_13-24h-response-promise-1200x628.jpg
gmp-img_14-language-accessibility-1200x628.jpg
gmp-img_15-legal-shield-1200x628.jpg
```

**Square 1200×1200** (15 plików) — ta sama lista z sufiksem `-1200x1200.jpg`
**Portrait 960×1200** (15 plików) — ta sama lista z sufiksem `-960x1200.jpg`

### 6.2 Logo — 2 pliki

- `gmp-logo-square-1200x1200-final.png` (wymagane przez PMax)
- `gmp-logo-landscape-1200x300-final.png` (zalecane)

### 6.3 Headlines (15, każdy ≤30 znaków)

```
Hand Over Your Case Today
Don't File MOS 2.0 Alone
11 Immigration Lawyers
10 000+ Clients Helped
Wroclaw Residence Permits
Get Your Single Permit
Speed Up Your Fingerprints
14 Days To Appeal Refusal
4.9 Star Rated Lawyers
Lower Silesia Experts
Permanent Residence Help
EU Long-Term Resident
We Take Over Stuck Cases
Avoid MOS 2.0 Mistakes
24h Response Time
```

### 6.4 Long Headlines (5, każdy ≤90 znaków)

```
Don't risk illegal stay with MOS 2.0. Let our 11 lawyers handle your case.
Waiting 12 months for fingerprints in Wroclaw? We can speed up your case.
Hand over your residence permit case to licensed experts in Lower Silesia.
Got a refusal letter? You have 14 days to appeal. Contact us for a free review.
10 000+ foreigners trusted us with their stay in Poland. Get your permit safely.
```

### 6.5 Descriptions (5, każdy ≤90 znaków)

```
We handle all 7 steps of MOS 2.0 from Trusted Profile to final decision.
Stop guessing the legal basis. Our Wroclaw team ensures your application is correct.
Case stuck? We take over ongoing proceedings and force the office to act.
We speak English, Ukrainian and Russian. Free case assessment within 24 hours.
Licensed immigration lawyers in Lower Silesia. 4.9 rating on Google.
```

### 6.6 Business name + CTA

- **Business name:** `GetMyPermit`
- **Call-to-action:** `Get Quote` (lub `Sign Up` jeśli Get Quote niedostępny)

### 6.7 Video — SKIP na starcie

Nie wgrywaj video — mamy tylko storyboardy (PNG), nie MP4. Google auto-wygeneruje slideshow z obrazów. To nie jest idealne ale workable. Kiedy będziemy mieli MP4, wrócimy tu.

**WAŻNE:** Google ostrzega że brak video obniży „Ad Strength" — zignoruj to ostrzeżenie i kontynuuj.

---

## 7. Search themes (20 tematów)

W sekcji "Search themes" asset group wklej każdy jako osobny temat:

```
immigration lawyer wroclaw
residence permit poland help
temporary residence card wroclaw
mos 2.0 application help
speed up fingerprints wroclaw
appeal visa refusal poland
single permit wroclaw
permanent residence poland lawyer
eu long term resident poland
polish citizenship lawyer
case takeover immigration poland
trusted profile foreigner poland
lower silesia immigration office help
legalize stay in poland
immigration law firm wroclaw
residence card delay help
karta pobytu lawyer english
mos 2.0 registration help
immigration appeal 14 days poland
work permit lawyer wroclaw
```

---

## 8. Audience signals

### 8.1 Custom segments — stwórz 2

**Segment 1: `GMP - Competitor & DIY Intent`**
- Typ: **People who searched for any of these terms on Google**
- Keywords:
  ```
  migrant expert wrocław
  cgo legal wrocław
  jak złożyć wniosek mos 2.0
  karta pobytu wrocław status sprawy
  ```
- Plus: **People who visited these sites** (URLs):
  ```
  https://migrantexpert.pl
  https://cgolegal.pl
  https://mos.cudzoziemcy.gov.pl
  https://przybysz.duw.pl
  ```

**Segment 2: `GMP - Stuck Case & Refusal Intent`**
- Keywords:
  ```
  odwołanie od decyzji wojewody dolnośląskiego
  brak wezwania na odciski palców wrocław
  ponaglenie urząd wojewódzki wrocław
  odmowa karty pobytu co robić
  ```
- URLs:
  ```
  https://www.gov.pl/web/udsc/odwolania
  https://duw.pl/pl/obsluga-klienta/cudzoziemcy
  ```

### 8.2 Interests (Affinity/In-market)

Dodaj te 5 z katalogu Google:
```
Immigration & Visas
Legal Services
Expatriates
Moving to Poland
Foreign Language Study
```

### 8.3 Demographics

- Wiek: **22 do 50**
- Płeć: **All**
- Parental status: **Parents + Non-parents** (obydwa zaznaczone)
- Household income: **All** (nie filtrujemy)

---

## 9. Negative keywords — stwórz listę

1. Przejdź do **Narzędzia → Shared library → Negative keyword lists → + New list**
2. Nazwa listy: `GMP - Global Negatives - v1`
3. Wklej 51 słów poniżej (każde jako osobny wpis, match type: **Phrase**):

```
darmowa porada prawna
free legal advice
бесплатна юридична консультація
jak samemu wypełnić wniosek
how to fill application yourself
як самостійно заповнити
wzór wniosku karta pobytu
application template
warszawa
kraków
gdańsk
poznań
łódź
katowice
szczecin
lublin
schengen visa
wiza turystyczna
tourist visa
business visa
wiza biznesowa
reddit
forum
wykop
quora
facebook groups
grupy facebook
tani prawnik
cheap lawyer
najtańsza kancelaria
praca dla cudzoziemców
jobs for foreigners
agencja pracy
employment agency
studia w polsce
study in poland
wynajem mieszkania wrocław
rent apartment wroclaw
pesel jak wyrobić
how to get pesel
karta polaka
pole's card
azyl
asylum
uchodźca
refugee
status uchodźcy
bochenek i wspólnicy
cgo legal
migrant expert
migrantexpert
```

4. Po zapisaniu → **Apply to campaign: GMP - PMax - Dolny Slask - EN**

---

## 10. Final settings i save

### Przed zapisem sprawdź:

| Pole | Oczekiwana wartość |
|---|---|
| Status | **PAUSED** (nie Enabled!) |
| Primary conversion action | GMP - Lead Submit |
| Bidding | Maximize conversions (no tCPA target) |
| Budget | 150 PLN/day |
| Locations | Dolnośląskie only, "People in" presence |
| Languages | English only |
| Asset Group | GMP - EN Core (1 grupa) |
| Images | 45 + 2 logos uploaded |
| Headlines | 15 |
| Long headlines | 5 |
| Descriptions | 5 |
| Search themes | 20 |
| Audience signals | 2 custom + 5 interests + demo 22-50 |
| Negative list | GMP - Global Negatives - v1 attached |
| Start date | 2026-04-26 |
| Status final | PAUSED |

Kliknij **Save and Publish** (NIE Launch — status musi zostać Paused).

---

## 11. Weryfikacja Enhanced Conversions (kluczowe dla jakości danych)

Po stworzeniu kampanii:

1. Przejdź do **Narzędzia → Cele → Konwersje → GMP - Lead Submit**
2. Zakładka **"Enhanced Conversions"**
3. Status powinien być "Active" lub "Recording" po 24h od pierwszej konwersji
4. Jeśli widzisz przycisk **"I agree to the customer data terms"** — kliknij go (wymagane raz, bez tego Google nie przyjmuje danych enhanced conv)
5. Jeśli nie masz uprawnień administratora — zostaw w raporcie, że user musi to zrobić ręcznie

---

## 12. Raport zwrotny

Po zakończeniu zwróć:

1. **URL utworzonej kampanii** (klikalny link do Google Ads UI)
2. **Optimization score** dashboardu kampanii (cel: ≥60%)
3. **Ad strength** asset group (cel: Good lub Excellent — jeśli Poor, doda headline'y których Google sugeruje do Twojego setu)
4. **Screenshoty:**
   - Widok ogólny kampanii (pokazuje Paused status + budżet + bidding)
   - Lista assets w asset group (widać 45 images + 2 logos + 15 headlines)
   - Lista negative keywords applied
   - Podsumowanie Audience signals
5. **Flagi** — cokolwiek wymagające ręcznej akcji ode mnie:
   - Enhanced Conversions agreement (jeśli nie zaakceptowany)
   - img_04 refusal-letter-shock — czy wgrany czy pominięty (godło RP może być problem policy)
   - Brak video (Google pokaże ostrzeżenie Ad Strength)
   - Inne

---

## Zasady bezwarunkowe (NIE łam)

- ❌ **NIE uruchamiaj kampanii** — ma zostać PAUSED do momentu manualnego startu klienta
- ❌ **NIE dodawaj innych województw** — lead z Warszawy = 0 wartości dla kancelarii
- ❌ **NIE dodawaj innych języków** — decyzja strategiczna, tylko EN
- ❌ **NIE zmieniaj wartości konwersji** — już skonfigurowane jako value-based 10/60/200 PLN
- ❌ **NIE ustawiaj tCPA ani tROAS** — potrzebujemy Max Conversions bez target na pierwsze 4 tyg.
- ❌ **NIE pomijaj żadnego obrazu** poza img_04 (flag godła RP — czekaj na decyzję)
- ❌ **NIE wklejaj negatives bez match type Phrase** — inaczej Google potraktuje je zbyt luźno

---

**Gotowe — zaczynaj.**

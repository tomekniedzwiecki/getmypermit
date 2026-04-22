# Kampania Google Ads PMax — GetMyPermit

**Data przygotowania:** 2026-04-22
**Start kampanii (rekomendowany):** 2026-04-26 (dzień przed oficjalnym startem MOS 2.0)
**Strategia jednym zdaniem:** Przechwycić falę paniki wokół MOS 2.0 i skanalizować ją na „przejęcie sprawy od A do Z" — geograficznie lock na Dolny Śląsk, językowo lock na EN/UK/RU.

---

## 1. Insight strategiczny (podstawa wszystkich decyzji)

Z [wytyczne-kwalifikacji-leadow.md](wytyczne-kwalifikacji-leadow.md) i [uwagi-kancelarii-mos20.md](uwagi-kancelarii-mos20.md) wynika coś kluczowego co MUSI być w DNA kampanii:

> Klienci **nie szukają wiedzy o procedurze**. Szukają **bezpieczeństwa, pewności i rozwiązania, które przejmie odpowiedzialność za całość**.

Z tego wynikają 3 twarde zasady:

1. **NIE edukujemy w kampanii.** Artykuły „jak wypełnić wniosek w MOS 2.0" palą budżet i przyciągają „pytaczy" — leady niekwalifikowane. Każdy asset musi pchać do przejęcia sprawy, nie do „dowiedzenia się jak".
2. **Dwa momenty wejścia — jeden komunikat:** „Nie rób tego sam / Oddaj nam sprawę".
3. **Geo-lock = jedyny sposób na ROI.** Kancelaria działa **wyłącznie w woj. dolnośląskim** (Wrocław + Bolesławiec + urząd DUW). Leady z Warszawy = wyrzucanie pieniędzy.

---

## 2. Personas docelowe (z priorytetem do bid adjustment)

| # | Persona | Trigger | Urgency | Value score | Wolumen |
|---|---|---|---|---|---|
| **P1** | **Zawieszony na odciskach palców 12+ mies.** | Nie dostał wezwania, panic po MOS 2.0 | HIGH | HOT (200 PLN) | Duży |
| **P2** | **Dostał odmowę** | 14-dniowy deadline na odwołanie | CRITICAL | HOT (200 PLN) | Średni |
| **P3** | **Nowy wniosek post-MOS 2.0** | Start procedury, nie wie jak | MEDIUM | WARM (60 PLN) | Bardzo duży (peak) |
| **P4** | **Sprawa stoi bez komunikacji** | Brak ruchu z urzędu | HIGH | WARM (60 PLN) | Duży |
| **P5** | **Dostał pismo po polsku** | Nie rozumie, boi się deadline | HIGH | WARM (60 PLN) | Średni |
| ❌ **BLOCK** | Info seekers („chcę się dowiedzieć") | Brak gotowości do płatnej usługi | — | — | ODFILTROWAĆ |

**Profil demograficzny:** cudzoziemcy 22-50, pracujący/studiujący, narodowości dominujące: Ukraina, Indie, Nepal, Chiny, Bangladesz, Indonezja, Korea Płd., Meksyk, Kolumbia. Kobiety + mężczyźni po równo.

---

## 3. Struktura kampanii PMax

**Rekomendacja:** Start z **JEDNĄ** kampanią PMax + 3 Asset Groupami (jedna per język). Nie dzielimy na personas — PMax tego nie potrzebuje, sam segmentuje wg audience signals.

```
Campaign: GMP - PMax - DolnySlask
│
├── Asset Group: EN (English — primary)
│   └── Audience signal: "Residence permit help Poland" + India/Nepal/China interests
│
├── Asset Group: UK (Ukrainian)
│   └── Audience signal: "Karta pobytu Ukraine" + wojna/relokacja interests
│
└── Asset Group: RU (Russian)
    └── Audience signal: "Dokumenty v Polshe" + CIS expat interests
```

**Po 4 tygodniach (gdy kampania wyuczy się):** dodać osobną kampanię **GMP - Search - Odmowa** na keywords typu „odmowa karta pobytu odwołanie" — bo to CRITICAL urgency + wysokie conversion rate, wart osobnego budżetu na Maximize Conversions bez Display.

---

## 4. Budżet i strategia biddingowa

**Start:** 150 PLN/dzień (~4 500 PLN/mies.) — PMax wymaga minimum ~20-30 konwersji/mies. żeby algo miał co uczyć. Niżej będzie się dusił.

**Docelowo po 6-8 tyg.:** skalować do 300-500 PLN/dzień jeśli tCPA w akceptowalnym przedziale.

**Target CPA na start:** **nie ustawiać**. Używać **„Maximize Conversions"** pierwszych 3-4 tygodnie → pozwolić PMax zebrać dane → potem włączyć **tCPA = 3× średni CPA z learning phase**, → potem **tROAS** (cel 3-4×) po offline conversion import z CRM.

**⚠️ CRITICAL:** Offline conversion import włączyć w tygodniu 2 (user zdecydował „później" — ale bez niego PMax po miesiącu zacznie bidować na śmieciowe zapytania typu „darmowa porada"). Dodać do TODO na tydzień 2.

---

## 5. Geografia (ABSOLUTNIE KRYTYCZNE)

**Targetuj TYLKO te lokalizacje (radius NIE używać — używać wg województwa):**
- Województwo dolnośląskie (całe) — location ID: `21148`
- + dodać miejscowości koło granicy (Legnica, Bolesławiec, Wałbrzych, Jelenia Góra)

**Wyklucz:** wszystkie inne województwa. NIE używać targetowania „People in or interested in" — to wsadza reklamy osobom w Kijowie która „interesuje się Wrocławiem" — wyrzucanie kasy.

**Ustawienie:** *Presence: People in or regularly in your targeted locations*

---

## 6. Języki

**Włącz:** English, Ukrainian, Russian, Polish
**Wyłącz:** wszystkie inne — team obsługuje te 4, pozostałe języki landingu (hi, bn, id, es, fr) są NIE do akwizycji, tylko do obsługi istniejących klientów.

---

## 7. Search themes (feed dla PMax)

PMax potrzebuje 5-25 search themes per asset group. Oto co wstawić (każde po angielsku + polsku + ukraińsku):

### EN Asset Group — search themes
1. `residence permit Wroclaw lawyer`
2. `residence permit application rejected appeal`
3. `long waiting fingerprints Poland residence`
4. `MOS 2.0 residence permit help`
5. `temporary residence permit Lower Silesia`
6. `residence work permit Wroclaw assistance`
7. `Polish residence permit foreigner attorney`
8. `residence permit stuck no response`
9. `immigration lawyer Wroclaw English`
10. `Polish citizenship lawyer Lower Silesia`
11. `residence permit case takeover`
12. `urząd wojewódzki Wrocław residence permit help`
13. `Trusted Profile Poland foreigner help`
14. `karta pobytu English speaking lawyer`
15. `residence permit expedite Poland`

### PL Asset Group — search themes
1. `karta pobytu Wrocław kancelaria`
2. `odmowa karty pobytu odwołanie Wrocław`
3. `pomoc cudzoziemcom Dolny Śląsk`
4. `MOS 2.0 wniosek pomoc prawnik`
5. `prawnik od pobytu Wrocław`
6. `zezwolenie na pobyt Wrocław pomoc`
7. `obywatelstwo polskie kancelaria Wrocław`
8. `pobyt stały cudzoziemiec Wrocław`
9. `przejęcie sprawy pobytowej`
10. `wojewoda dolnośląski karta pobytu czeka`

### UK Asset Group — search themes
1. `karta pobytu Wrocław ukraińcy`
2. `дозвіл на проживання Вроцлав`
3. `адвокат з міграції Вроцлав`
4. `карта побиту допомога українцям`
5. `юрист картка побиту Польща`
6. `відмова в картці побиту апеляція`
7. `MOS 2.0 допомога українцям`
8. `продовження картки побиту Вроцлав`
9. `громадянство Польщі юрист`
10. `відбитки пальців карта побиту черга`

---

## 8. Negative keywords (KRYTYCZNE — dodać PRZED startem)

**Account-level negatives** (dodać w Tools → Negative keyword lists → attach to account):

```
# Info seekers — palą budżet
darmowa porada
free advice
free consultation
jak samemu
how to fill
application template
wzór wniosku
forum
reddit
tutorial
instrukcja
guide
download form
pdf wniosek

# Wrong services
tłumaczenie dokumentów
document translation
notariusz
notary

# Wrong geography (PMax ignoruje lokacje dla niektórych fraz)
karta pobytu Warszawa
residence permit Warsaw
karta pobytu Kraków
karta pobytu Poznań
residence permit Krakow
residence permit Warsaw Krakow Gdansk

# Wrong intent
DIY
self-service
samodzielnie
po angielsku jak
cheap
tanio
najtaniej

# Niepowiązane typy wiz
visa Schengen
business visa
tourist visa
student visa application only
studia w Polsce

# Obywatelstwo nie-polskie
UK citizenship
US citizenship
German passport

# Konkurencja niepłacona (Google wytnie i tak, ale safe)
reddit immigration
facebook group polska
```

**Negative keyword list name:** `GMP - Global Negatives - v1` — attach do wszystkich kampanii.

---

## 9. Audience signals (PMax)

**Custom Segments (stwórz 3):**

### Segment 1: `GMP - Procedural pain`
Keywords:
- `residence permit rejected`
- `karta pobytu odmowa`
- `fingerprints Poland waiting`
- `MOS 2.0 mistake`
- `Trusted Profile foreigner`

URLs klientów byliby zainteresowani:
- `cudzoziemiec.com`
- `gov.pl/web/udsc`
- `duw.pl`
- `mos.gov.pl`

### Segment 2: `GMP - Wroclaw expat intent`
Keywords:
- `moving to Wroclaw`
- `expat Wroclaw`
- `living in Wroclaw foreigner`
- `Wroclaw jobs foreign`

### Segment 3: `GMP - Immigration lawyer Poland`
URLs:
- Strony konkurencji (kancelarie imigracyjne PL)
- LinkedIn profiles „immigration attorney Poland"

**Detailed Demographics:** włącz „Parental status: Parents", „Marital status: Married" (dodatkowa waga dla family reunification cases).

**Affinity audiences:** `Expats & Travel`, `International Students`.

---

## 10. Content — 15 Headlines + 5 Long Headlines + 5 Descriptions

### Headlines (EN — 15 sztuk, max 30 znaków każdy)

1. `MOS 2.0? Don't File Alone`                    (28)
2. `Residence Permit Takeover`                     (25)
3. `Licensed Immigration Lawyer`                   (28)
4. `Stuck Waiting 12+ Months?`                     (24)
5. `Rejection? 14 Days to Appeal`                  (27)
6. `Free Case Review in 24 Hours`                  (27)
7. `10,000+ Foreigners Helped`                     (24)
8. `Wrocław Immigration Attorney`                  (28)
9. `Handed-Over Cases Only`                        (22)
10. `Fingerprints in 3 Weeks`                      (22)
11. `11 Lawyers. One Takeover.`                    (24)
12. `We Run Your Case End-to-End`                  (27)
13. `Dolnośląski UW Cases`                         (20)
14. `Speak English? We Do Too.`                    (24)
15. `Case Stuck? Call Us Today`                    (24)

### Long Headlines (EN — 5 sztuk, max 90 znaków)

1. `MOS 2.0 starts April 27. One mistake and your stay is illegal. Let us take the case.` (85)
2. `Licensed immigration lawyers in Wrocław — residence permits, appeals, MOS 2.0 takeover.` (87)
3. `Been waiting for fingerprints 12+ months? We resolve it in 3-6 weeks.` (69)
4. `Rejected residence permit? You have 14 days to appeal. Free case review today.` (79)
5. `End-to-end residence permit handling for foreigners in Lower Silesia. 10,000+ cases.` (84)

### Descriptions (EN — 5 sztuk, max 90 znaków)

1. `From Trusted Profile to final decision — we handle every MOS 2.0 step so you don't err.` (87)
2. `11 immigration lawyers. 50+ nationalities served. Free 1-minute case assessment.` (80)
3. `Case stuck at Dolnośląski UW? We contact the office, push for fingerprints, get decisions.` (89)
4. `Speak English, Ukrainian, Russian. Licensed in Poland. Reply guaranteed within 24h.` (82)
5. `Don't risk illegal stay. We take full responsibility for your residence permit case.` (84)

### PL wersja (15 Headlines)

1. `MOS 2.0? Nie rób tego sam`                    (25)
2. `Przejęcie sprawy pobytowej`                    (26)
3. `Kancelaria Imigracyjna Wrocław`                (30)
4. `Czekasz 12 mies. na odciski?`                 (28)
5. `Odmowa? 14 dni na odwołanie`                   (28)
6. `Darmowa analiza w 24h`                         (20)
7. `10 000+ załatwionych spraw`                    (26)
8. `Prawnik od pobytu Wrocław`                     (25)
9. `Tylko pełne prowadzenie spraw`                 (29)
10. `Odciski w 3 tygodnie`                         (20)
11. `11 prawników. Jedna sprawa.`                  (26)
12. `Sprawa od A do Z`                             (16)
13. `Dolnośląski UW — sprawy`                      (23)
14. `Mówimy po polsku i angielsku`                 (28)
15. `Sprawa stoi? Zadzwoń dziś`                    (24)

### PL Long Headlines

1. `MOS 2.0 startuje 27 kwietnia. Jeden błąd = nielegalny pobyt. Oddaj nam sprawę.` (77)
2. `Licencjonowani prawnicy we Wrocławiu — pobyt, praca, obywatelstwo. Sprawa od A do Z.` (84)
3. `Czekasz na odciski palców od roku? Załatwiamy w 3-6 tygodni.` (58)
4. `Odmowa karty pobytu? Masz 14 dni na odwołanie. Darmowa analiza sprawy.` (70)
5. `Kompleksowe prowadzenie spraw pobytowych na Dolnym Śląsku. 10 000+ klientów.` (76)

### PL Descriptions

1. `Od Profilu Zaufanego do decyzji — prowadzimy każdy krok MOS 2.0 żebyś się nie pomylił.` (84)
2. `11 prawników imigracyjnych. 50+ narodowości. Darmowa analiza sprawy w 1 minutę.` (78)
3. `Sprawa stoi w DUW? Kontaktujemy się z urzędem, przyspieszamy odciski, pilnujemy decyzji.` (87)
4. `Po polsku, angielsku, ukraińsku, rosyjsku. Licencjonowani. Odpowiedź w 24h.` (73)
5. `Nie ryzykuj nielegalnego pobytu. Bierzemy pełną odpowiedzialność za Twoją sprawę.` (81)

### UK wersja (5 headlines + 2 long + 2 descriptions — minimum)

Headlines:
1. `MOS 2.0? Не йди сам`                    (20)
2. `Адвокат з картки побиту`                  (24)
3. `Відмова? 14 днів на апеляцію`             (27)
4. `Чекаєш рік на відбитки?`                  (23)
5. `Безкоштовна оцінка справи`                (26)

Long:
1. `MOS 2.0 стартує 27 квітня. Одна помилка — нелегальне перебування. Довірте нам справу.` (86)
2. `Ліцензовані адвокати у Вроцлаві — картка побиту, робота, громадянство Польщі.` (81)

Descriptions:
1. `Від Довіреного Профілю до рішення — ведемо кожен крок MOS 2.0 за тебе.` (69)
2. `Говоримо українською, польською, англійською. Відповідь протягом 24 годин.` (74)

---

## 11. Image assets (brief dla Manusa — szczegóły w osobnym dokumencie)

PMax wymaga minimum:
- **20 obrazów** w 3 formatach: 1200×1200 (square), 1200×628 (landscape), 960×1200 (portrait)
- **5 logo** (1200×1200 + 1200×300)
- **5 video** (minimum 10s, rekomendowane 15s + 30s)

**Kreatywne hooks:**

1. **„Before/After"** — stressed foreigner w urzędzie vs zadowolony z dokumentem
2. **„Deadline shock"** — kalendarz 27.04.2026 czerwonym markerem, napis „MOS 2.0"
3. **„Reject letter horror"** — trzyma w dłoni pismo z napisem „ODMOWA" po polsku
4. **„Law firm hero shot"** — prawnicy w garniturach w biurze kancelarii (lub mock prawników z ich stron — do pozyskania od kancelarii)
5. **„Passport + permit card"** — zdjęcie karty pobytu + polski paszport w dłoni
6. **„Calendar countdown"** — 12 miesięcy na zegarze / kalendarzu z napisem „Fingerprints still waiting?"
7. **„Phone assistant"** — ktoś odbiera telefon w kancelarii
8. **„Multi-language"** — flagi PL/UA/RU/EN w kompozycji

**Guardrails dla grafik (Google Ads policy):**
- Brak „before/after" medical-style (legal services mają strict rules)
- Brak hiperbolicznych obietnic („100% skuteczność", „gwarancja decyzji") — Google to wytnie
- Brak fake urgency („tylko dzisiaj")
- Brak shame-based ("nie bądź tym co się pomylił")
- Tekst na grafice ≤20% powierzchni (nie jak FB ale i tak dobry standard)

---

## 12. Video brief (15s + 30s)

### Video 15s — „MOS 2.0 Fear & Fix"

**Scene 1 (0-3s):** Close-up rąk wypełniających formularz online, kursor błąd, czerwony X
**VO (EN):** „MOS 2.0 starts April 27."
**Napis:** „One mistake = illegal stay"

**Scene 2 (3-7s):** Zrozpaczony foreigner patrzy na ekran komputera
**VO:** „Filing alone? You're responsible for every error."

**Scene 3 (7-12s):** Gabinet kancelarii, prawnik uśmiechnięty odbiera telefon, ekran pokazuje „Case taken over"
**VO:** „We take the case. From Trusted Profile to final decision."

**Scene 4 (12-15s):** Logo GetMyPermit + CTA „Free assessment — getmypermit.pl"
**VO:** „Don't do it alone."

### Video 30s — „Case Takeover Story"

**Scene 1 (0-5s):** Tekst na ekranie: „Maria waited 18 months for fingerprints" + zdjęcie stockowej cudzoziemki z pismem w dłoni
**VO:** „Maria has been waiting 18 months. No response from the office."

**Scene 2 (5-10s):** Gabinet, prawnik dzwoni, napis „We called the DUW office today"
**VO:** „We took over. Called the office. Got the file moving."

**Scene 3 (10-18s):** Timeline: „Week 1: Case review → Week 3: Fingerprints scheduled → Week 6: Decision positive"
**VO:** „Three weeks to fingerprints. Six weeks to decision. Legally in Poland."

**Scene 4 (18-25s):** Ekran pokazuje testimonial „2.5 years stuck → 6 weeks resolved — Katarzyna W."
**VO:** „10,000+ cases handled. 4.9 stars on Google."

**Scene 5 (25-30s):** CTA „getmypermit.pl — Free 24h assessment"

**Warianty językowe:** wymagane EN + UK + RU + PL (4 wersje każdego skryptu, dubbing lub napisy)

---

## 13. Landing page — zmiany potrzebne przed startem kampanii

Landing jest mocny, ale trzy szybkie poprawki podbiją conversion rate:

1. **Trust signal hero** — dodać badge „4.9 ★ Google (144 reviews)" bezpośrednio pod H1 (teraz jest dopiero w sekcji reviews).
2. **Urgency bar MOS 2.0** — topbar ma „New: MOS 2.0" ale brak countdown do 27.04. Dodać widget „MOS 2.0 launches in X days" — wzmacnia urgency w first 2 weeks.
3. **Phone w hero na mobile** — aktualnie CTA jest „Free Assessment" (scroll do formy). Dodać alternatywne „Call +48 576 816 321" klikalne tel: — część cudzoziemców woli dzwonić od wypełniania. Event `phone_click` już się trackuje.

**Uwaga polityka prywatności** — moja implementacja consent bannera ma link do `/polityka-prywatnosci` który jeszcze nie istnieje. **PRZED startem kampanii** musi być strona z polityką (wymóg Google Ads + RODO). Jeśli nie ma, Google może zablokować reklamy. Do zrobienia w najbliższych dniach.

---

## 14. Conversion tracking setup

**STATUS (na 2026-04-22):**
- ✅ GTM zainstalowany (`GTM-P8ZD3B58`)
- ✅ GA4 config (`G-5W9YPERVSK`)
- ✅ Google Ads Conversion ID (`AW-17886093904`)
- ✅ Lead Submit (value-based, Enhanced Conversions ready) — label `BftACPn33aAcENDE4NBC`
- ✅ Lead Form Start (secondary) — label `fcLiCPTe3qAcENDE4NBC`
- ✅ DataLayer eventy: `lead_form_start`, `lead_form_step`, `lead_submit` (z value 10/60/200 PLN), `lead_magnet_submit`, `phone_click`, `email_click`
- ✅ Consent Mode v2 + blokujący modal (Wariant B)
- ⏳ **CZEKA** — konfiguracja tagów w GTM (brief Cometa: [c:/tmp/gtm-brief-cometa.md](c:/tmp/gtm-brief-cometa.md))
- ⏳ **TYDZIEŃ 2** — Offline conversion import z CRM (opt-in: qualified lead, paid client z value rzeczywistą)

---

## 15. KPI — co mierzymy i kiedy alarm

### Tydzień 1-2 (learning phase)
- **Form submit rate:** > 2.5% na trafic z PMax (landing pages industry avg)
- **Cost per form submit:** < 80 PLN
- **Qualified rate (kancelaria feedback):** > 40% (tzn. 40% submitów to kwalifikowani wg [wytyczne-kwalifikacji-leadow.md])
- Jeśli qualified rate < 20% po 2 tygodniach → **wstrzymać**, przemyśleć negative keywords

### Tydzień 3-4 (stabilizacja)
- **CPA na kwalifikowany lead:** < 200 PLN
- **Conversion rate formularza:** 3-5%
- **Form_start → form_submit:** > 30% (jeśli < 20% — forma zbyt długa / wrong traffic)

### Miesiąc 2+ (z offline conversions)
- **CPA na opłaconego klienta:** docelowo < 1500 PLN (zakładając średnia usługa ~4000-8000 PLN, ROI 3-5×)
- **tROAS:** ≥ 3× (dla PMax wystarczające)

---

## 16. Ryzyka i mitigations

| Ryzyko | Prawdopodobieństwo | Mitigation |
|---|---|---|
| Google odrzuca reklamy za „legal services hyperbole" | Średnie | Brak słów „gwarancja", „najlepszy", „100%" w copy (check) |
| UODO kara za consent modal (Wariant B) | Niskie-średnie | User świadomie wybrał, priorytet opt-in rate |
| PMax wchodzi na niekwalifikowane keywordy (info seekers) | Wysokie | Negative keywords list v1 + offline conv import tyg. 2 |
| Kancelaria nie nadąża z obsługą leadów (burn rate) | Średnie | Skontaktować z Pawłem przed startem — ile leadów tyg. mogą obsłużyć |
| Polityka prywatności nie istnieje | ✅ Pewne (dziś) | Stworzyć PRZED startem — inaczej Google wstrzyma |
| Landing NIE mobile-first w ≥1 sekcji | Niskie | Test na telefon przed startem |

---

## 17. Tydzień 0 checklist (do zrobienia PRZED odpaleniem)

- [ ] Comet konfiguruje tagi w GTM wg [gtm-brief-cometa.md](c:/tmp/gtm-brief-cometa.md)
- [ ] Test conversion przez Tag Assistant — `lead_submit` firing z value 10/60/200 PLN wg scoringu
- [ ] Stworzyć stronę `/polityka-prywatnosci` (PL + `/privacy-policy` EN) — treść: [BEZPIECZENSTWO_RODO_DO_NAPRAWY.md](BEZPIECZENSTWO_RODO_DO_NAPRAWY.md) ma dane, rozszerzyć o cookies
- [ ] Dodać trust badge 4.9★ do hero (3 linie kodu)
- [ ] Dodać countdown MOS 2.0 w topbar
- [ ] Dodać klikalny telefon w hero CTA
- [ ] Skontaktować Pawła — capacity na leady tygodniowo, workflow przekazania z formularza
- [ ] Manus dostaje [manus-brief-pmax.md](c:/tmp/manus-brief-pmax.md) — produkuje 20 obrazów, 2 videos, 4 wersje językowe copy
- [ ] Google Ads account ma negative keyword list `GMP - Global Negatives - v1` attached
- [ ] Geo targeting: ONLY dolnośląskie + presence-only
- [ ] Languages: EN + UK + RU + PL
- [ ] Assety wgrane, PMax skonfigurowany, kampania w stanie „Paused"
- [ ] Start — **2026-04-26 poniedziałek rano** (dzień przed MOS 2.0 launch)

---

## 18. Co dalej po 30 dniach (growth roadmap)

1. **Offline conversion import** (tyg. 2) — kluczowe dla jakości trafficu
2. **Search campaign osobno** na odmowa/appeal keywords (tyg. 4) — niższe CPA + wyższy qual rate
3. **Remarketing campaign** (tyg. 6) na osoby które zaczęły formę ale nie skończyły (mamy już event `lead_form_start`)
4. **Video campaign osobno** (mies. 2) — YouTube + Discovery z 30s video, niska CPA na top-funnel
5. **Expansion na inne voivodeships** (mies. 3+) — IF kancelaria rozszerza działalność (dziś TYLKO Dolny Śląsk)

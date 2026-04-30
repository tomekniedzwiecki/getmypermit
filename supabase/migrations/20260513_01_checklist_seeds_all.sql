-- ============================================================================
-- Etap II-B — Seed wszystkich list audytowych Pawła (11 kategorii)
-- ============================================================================

-- ============================================================================
-- Seed checklist dla kategorii: pobyt_spolka
-- Źródło: dane_od_pawla/rozwinęcie v3/Działność Pobyt spółka  Lista Audyt .docx
-- Wygenerowano automatycznie przez scripts/generate_checklist_seeds.py
-- ============================================================================

-- Idempotentność: usuń istniejące wzorce dla tej kategorii (jeśli były)
DELETE FROM gmp_checklist_definitions WHERE category_code = 'pobyt_spolka';

INSERT INTO gmp_checklist_definitions (category_code, section, label, parent_label, sort_order, is_required)
VALUES
    ('pobyt_spolka', 'braki_formalne', 'Wniosek – każda rubryka musi być wypełniona albo zapis Nie dotyczy', NULL, 10, TRUE),
    ('pobyt_spolka', 'braki_formalne', 'Pełnoletni – podpis w ramce oraz na 8 stronie', NULL, 20, TRUE),
    ('pobyt_spolka', 'braki_formalne', 'Paszport', NULL, 30, TRUE),
    ('pobyt_spolka', 'braki_formalne', '4 Zdjęcia', NULL, 40, TRUE),
    ('pobyt_spolka', 'braki_formalne', '340 zł', NULL, 50, TRUE),
    ('pobyt_spolka', 'braki_formalne', 'Załącznik nr 1 (tylko przy Spółce)', NULL, 60, TRUE),
    ('pobyt_spolka', 'braki_formalne', 'Pełnomocnictwo + 17 zł', NULL, 70, FALSE),
    ('pobyt_spolka', 'braki_formalne', 'Poprzednia legalizacja np. karta pobytu', NULL, 80, FALSE),
    ('pobyt_spolka', 'braki_merytoryczne', 'Miejsce zamieszkania', NULL, 90, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'Ważne', NULL, 100, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'Czy strona jest wymieniona?', NULL, 110, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'Czy ten sam adres co we wniosku?', NULL, 120, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'Ubezpieczenie', NULL, 130, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'ZUS P ZZA lub ZUA', NULL, 140, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'Dochód', NULL, 150, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'CEIDG', NULL, 160, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'Aktualny wyciąg z Księgi PIR', NULL, 170, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'Umowy o współprace', NULL, 180, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'SPÓŁKA', NULL, 190, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'Dochody z pracy w Spółce (umowa + legalizacja)', NULL, 200, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'Z tytułu funkcji (uchwała o powołaniu + przelewy + legalizacja)', NULL, 210, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'CIT-8 + UPO lub Właściwe Zeznanie roczne PIT + UPO za rok poprzedni', NULL, 220, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'Zaświadczenie o niezaleganiu w opłacaniu składek ZUS', NULL, 230, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'Zaświadczenie o niezaleganiu w podatkach', NULL, 240, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'przez Spółkę', NULL, 250, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'przez Wnioskodawcę', NULL, 260, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'Oświadczenia', NULL, 270, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'o siedzibie Spółki', NULL, 280, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'o aktualnym stanie zatrudnienia', NULL, 290, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'Nowa Spółka lub CEIDG – Biznesplan', NULL, 300, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'INNE', NULL, 310, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'Umowa Spółki', NULL, 320, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'Aktualny Bilans', NULL, 330, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'Aktualny Rachunek Zysków i Strat', NULL, 340, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'Umowy o współprace', NULL, 350, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'Faktury', NULL, 360, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', 'PESEL', NULL, 370, TRUE),
    ('pobyt_spolka', 'braki_merytoryczne', '100 zł za kartę', NULL, 380, TRUE);

-- ============================================================================
-- Seed checklist dla kategorii: pobyt_jdg_ukr
-- Źródło: dane_od_pawla/rozwinęcie v3/Dziąłnośc gosp Lista audyt - CEIDG UKR .docx
-- Wygenerowano automatycznie przez scripts/generate_checklist_seeds.py
-- ============================================================================

-- Idempotentność: usuń istniejące wzorce dla tej kategorii (jeśli były)
DELETE FROM gmp_checklist_definitions WHERE category_code = 'pobyt_jdg_ukr';

INSERT INTO gmp_checklist_definitions (category_code, section, label, parent_label, sort_order, is_required)
VALUES
    ('pobyt_jdg_ukr', 'braki_formalne', 'Wniosek – każda rubryka musi być wypełniona albo zapis Nie dotyczy', NULL, 10, TRUE),
    ('pobyt_jdg_ukr', 'braki_formalne', 'Pełnoletni – podpis w ramce oraz na 8 stronie', NULL, 20, TRUE),
    ('pobyt_jdg_ukr', 'braki_formalne', 'Paszport', NULL, 30, TRUE),
    ('pobyt_jdg_ukr', 'braki_formalne', '4 Zdjęcia', NULL, 40, TRUE),
    ('pobyt_jdg_ukr', 'braki_formalne', '340 zł', NULL, 50, TRUE),
    ('pobyt_jdg_ukr', 'braki_formalne', 'Pełnomocnictwo + 17 zł', NULL, 60, FALSE),
    ('pobyt_jdg_ukr', 'braki_formalne', 'Poprzednia legalizacja np. karta pobytu', NULL, 70, FALSE),
    ('pobyt_jdg_ukr', 'braki_merytoryczne', 'Miejsce zamieszkania', NULL, 80, TRUE),
    ('pobyt_jdg_ukr', 'braki_merytoryczne', 'Ważne', NULL, 90, TRUE),
    ('pobyt_jdg_ukr', 'braki_merytoryczne', 'Czy strona jest wymieniona?', NULL, 100, TRUE),
    ('pobyt_jdg_ukr', 'braki_merytoryczne', 'Czy ten sam adres co we wniosku?', NULL, 110, TRUE),
    ('pobyt_jdg_ukr', 'braki_merytoryczne', 'Ubezpieczenie', NULL, 120, TRUE),
    ('pobyt_jdg_ukr', 'braki_merytoryczne', 'ZUS P ZZA lub ZUA – podpis + pieczątka firmy', NULL, 130, TRUE),
    ('pobyt_jdg_ukr', 'braki_merytoryczne', 'Dochód', NULL, 140, TRUE),
    ('pobyt_jdg_ukr', 'braki_merytoryczne', 'CEIDG', NULL, 150, TRUE),
    ('pobyt_jdg_ukr', 'braki_merytoryczne', 'Aktualny wyciąg z Księgi PIR', NULL, 160, TRUE),
    ('pobyt_jdg_ukr', 'braki_merytoryczne', 'Umowy o współprace', NULL, 170, TRUE),
    ('pobyt_jdg_ukr', 'braki_merytoryczne', 'Oświadczenie o utrzymaniu', NULL, 180, TRUE),
    ('pobyt_jdg_ukr', 'braki_merytoryczne', 'PESEL', NULL, 190, TRUE),
    ('pobyt_jdg_ukr', 'braki_merytoryczne', '100 zł za kartę', NULL, 200, TRUE);

-- ============================================================================
-- Seed checklist dla kategorii: pobyt_konkubinat
-- Źródło: dane_od_pawla/rozwinęcie v3/Konkubinat Lista Audyt -docx.docx
-- Wygenerowano automatycznie przez scripts/generate_checklist_seeds.py
-- ============================================================================

-- Idempotentność: usuń istniejące wzorce dla tej kategorii (jeśli były)
DELETE FROM gmp_checklist_definitions WHERE category_code = 'pobyt_konkubinat';

INSERT INTO gmp_checklist_definitions (category_code, section, label, parent_label, sort_order, is_required)
VALUES
    ('pobyt_konkubinat', 'braki_formalne', 'Wniosek – każda rubryka musi być wypełniona lub zapis Nie dotyczy', NULL, 10, TRUE),
    ('pobyt_konkubinat', 'braki_formalne', 'Pełnoletni – podpis w ramce oraz na 8 stronie', NULL, 20, TRUE),
    ('pobyt_konkubinat', 'braki_formalne', 'Małoletni powyżej 13 lat – podpis małoletniego w ramce + rodzica z którym łączymy pod wnioskiem', NULL, 30, TRUE),
    ('pobyt_konkubinat', 'braki_formalne', 'Małoletni poniżej 13 lat – pusta ramka + podpis rodzica z którym łączymy pod wnioskiem', NULL, 40, TRUE),
    ('pobyt_konkubinat', 'braki_formalne', 'Paszport', NULL, 50, TRUE),
    ('pobyt_konkubinat', 'braki_formalne', '4 Zdjęcia', NULL, 60, TRUE),
    ('pobyt_konkubinat', 'braki_formalne', '340 zł', NULL, 70, TRUE),
    ('pobyt_konkubinat', 'braki_formalne', 'Pełnomocnictwo + 17 zł', NULL, 80, FALSE),
    ('pobyt_konkubinat', 'braki_formalne', 'Poprzednia legalizacja np. karta pobytu', NULL, 90, FALSE),
    ('pobyt_konkubinat', 'braki_merytoryczne', 'Paszport', NULL, 100, TRUE),
    ('pobyt_konkubinat', 'braki_merytoryczne', 'Paszport Strony', NULL, 110, TRUE),
    ('pobyt_konkubinat', 'braki_merytoryczne', 'Paszport osoby, z którą łączymy', NULL, 120, TRUE),
    ('pobyt_konkubinat', 'braki_merytoryczne', 'w przypadku małoletniego', NULL, 130, TRUE),
    ('pobyt_konkubinat', 'braki_merytoryczne', 'Akt urodzenia', NULL, 140, TRUE),
    ('pobyt_konkubinat', 'braki_merytoryczne', 'Tłumaczenie przysięgłe', NULL, 150, TRUE),
    ('pobyt_konkubinat', 'braki_merytoryczne', 'w przypadku małżeństwa', NULL, 160, TRUE),
    ('pobyt_konkubinat', 'braki_merytoryczne', 'Akt małżeństwa', NULL, 170, TRUE),
    ('pobyt_konkubinat', 'braki_merytoryczne', 'Tłumaczenie przysięgłe', NULL, 180, TRUE),
    ('pobyt_konkubinat', 'braki_merytoryczne', 'Oświadczenie kto kogo utrzymuje', NULL, 190, TRUE),
    ('pobyt_konkubinat', 'braki_merytoryczne', 'Decyzja osoby, z którą łączymy', NULL, 200, TRUE),
    ('pobyt_konkubinat', 'braki_merytoryczne', 'Miejsce zamieszkania', NULL, 210, TRUE),
    ('pobyt_konkubinat', 'braki_merytoryczne', 'Ważne', NULL, 220, TRUE),
    ('pobyt_konkubinat', 'braki_merytoryczne', 'Czy strona jest wymieniona?', NULL, 230, TRUE),
    ('pobyt_konkubinat', 'braki_merytoryczne', 'Czy ten sam adres co we wniosku?', NULL, 240, TRUE),
    ('pobyt_konkubinat', 'braki_merytoryczne', 'Ubezpieczenie', NULL, 250, TRUE),
    ('pobyt_konkubinat', 'braki_merytoryczne', 'ZUS P ZCNA – musi być podpisany + pieczątka firmy', NULL, 260, TRUE),
    ('pobyt_konkubinat', 'braki_merytoryczne', 'lub polisa ubezpieczeniowa', NULL, 270, TRUE),
    ('pobyt_konkubinat', 'braki_merytoryczne', 'Dochód', NULL, 280, TRUE),
    ('pobyt_konkubinat', 'braki_merytoryczne', 'Ważna umowa o pracę', NULL, 290, TRUE),
    ('pobyt_konkubinat', 'braki_merytoryczne', 'Ważna umowa zlecenie + zaświadczenie o zarobkach', NULL, 300, TRUE),
    ('pobyt_konkubinat', 'braki_merytoryczne', 'Umowa renty!', NULL, 310, TRUE),
    ('pobyt_konkubinat', 'braki_merytoryczne', 'PESEL', NULL, 320, TRUE),
    ('pobyt_konkubinat', 'braki_merytoryczne', 'Opłata za kartę', NULL, 330, TRUE),
    ('pobyt_konkubinat', 'braki_merytoryczne', '100 zł', NULL, 340, TRUE),
    ('pobyt_konkubinat', 'braki_merytoryczne', '50 zł', NULL, 350, TRUE);

-- ============================================================================
-- Seed checklist dla kategorii: pobyt_staly_karta_polaka
-- Źródło: dane_od_pawla/rozwinęcie v3/POBYT STAŁY Audyt - Lista  KARTA POLAKA .docx
-- Wygenerowano automatycznie przez scripts/generate_checklist_seeds.py
-- ============================================================================

-- Idempotentność: usuń istniejące wzorce dla tej kategorii (jeśli były)
DELETE FROM gmp_checklist_definitions WHERE category_code = 'pobyt_staly_karta_polaka';

INSERT INTO gmp_checklist_definitions (category_code, section, label, parent_label, sort_order, is_required)
VALUES
    ('pobyt_staly_karta_polaka', 'dokumenty_wymagane', 'POBYT STAŁY KARTA POLAKA', NULL, 10, TRUE),
    ('pobyt_staly_karta_polaka', 'dokumenty_wymagane', 'Formularz wniosku na pobyt stały.', NULL, 20, TRUE),
    ('pobyt_staly_karta_polaka', 'dokumenty_wymagane', 'Kserokopia paszportu.', NULL, 30, TRUE),
    ('pobyt_staly_karta_polaka', 'dokumenty_wymagane', '4 aktualne fotografie – zdjęcia paszportowe, do karty pobytu, rozmiar 35 mm x 45 mm, kolorowe.', NULL, 40, TRUE),
    ('pobyt_staly_karta_polaka', 'dokumenty_wymagane', 'Umowa najmu', NULL, 50, TRUE),
    ('pobyt_staly_karta_polaka', 'dokumenty_wymagane', 'Umowa o pracę / zaświadczenie o studiowaniu (student)', NULL, 60, TRUE),
    ('pobyt_staly_karta_polaka', 'dokumenty_wymagane', 'Powiadomienie o nadaniu numeru PESEL.', NULL, 80, TRUE),
    ('pobyt_staly_karta_polaka', 'dokumenty_wymagane', 'Potwierdzenie opłaty 100 zł tytułem wydania karty pobytu.', NULL, 90, TRUE),
    ('pobyt_staly_karta_polaka', 'dokumenty_wymagane', 'Karta Polaka', NULL, 100, TRUE),
    ('pobyt_staly_karta_polaka', 'dokumenty_wymagane', 'Decyzja o udzieleniu karty Polaka', NULL, 110, TRUE),
    ('pobyt_staly_karta_polaka', 'dokumenty_wymagane', 'małoletni', NULL, 120, TRUE),
    ('pobyt_staly_karta_polaka', 'dokumenty_wymagane', 'akt urodzenia wraz z tłumaczeniem', NULL, 130, TRUE),
    ('pobyt_staly_karta_polaka', 'dokumenty_wymagane', 'oświadczenie rodziców o wykonywaniu obowiązku szkolnego przez dziecko w pl', NULL, 140, TRUE),
    ('pobyt_staly_karta_polaka', 'dokumenty_wymagane', 'trzeba wykazać dochód, ale nie liczymy na członków rodziny', NULL, 150, TRUE);

-- ============================================================================
-- Seed checklist dla kategorii: pobyt_staly_malzenstwo
-- Źródło: dane_od_pawla/rozwinęcie v3/POBYT STAŁY Audyt - Lista PS MAŁŻEŃSTWO.docx
-- Wygenerowano automatycznie przez scripts/generate_checklist_seeds.py
-- ============================================================================

-- Idempotentność: usuń istniejące wzorce dla tej kategorii (jeśli były)
DELETE FROM gmp_checklist_definitions WHERE category_code = 'pobyt_staly_malzenstwo';

INSERT INTO gmp_checklist_definitions (category_code, section, label, parent_label, sort_order, is_required)
VALUES
    ('pobyt_staly_malzenstwo', 'dokumenty_wymagane', 'Formularz wniosku na pobyt stały.', NULL, 10, TRUE),
    ('pobyt_staly_malzenstwo', 'dokumenty_wymagane', 'Kserokopia paszportu.', NULL, 20, TRUE),
    ('pobyt_staly_malzenstwo', 'dokumenty_wymagane', '4 aktualne fotografie – zdjęcia paszportowe, do karty pobytu, rozmiar 35 mm x 45 mm, kolorowe.', NULL, 30, TRUE),
    ('pobyt_staly_malzenstwo', 'dokumenty_wymagane', 'Potwierdzenie opłaty 640 zł tytułem udzielenia zezwolenia na pobyt stały.', NULL, 40, TRUE),
    ('pobyt_staly_malzenstwo', 'dokumenty_wymagane', 'Kserokopia dowodu osobistego obywatela RP.', NULL, 50, TRUE),
    ('pobyt_staly_malzenstwo', 'dokumenty_wymagane', 'Zaświadczenie o niezaleganiu w podatkach z właściwego ze względu na miejsce zamieszkania Urzędu Skarbowego – okres ważności nie dłużej niż 3 miesiące od daty wydania.', NULL, 60, TRUE),
    ('pobyt_staly_malzenstwo', 'dokumenty_wymagane', 'Oświadczenie o wyjazdach za właściwy okres, sporządzone na wzorze urzędowym.', NULL, 70, TRUE),
    ('pobyt_staly_malzenstwo', 'dokumenty_wymagane', 'Odpis zupełny aktu małżeństwa – okres ważności nie dłużej niż 3 miesiące od daty wydania.', NULL, 80, TRUE),
    ('pobyt_staly_malzenstwo', 'dokumenty_wymagane', 'Powiadomienie o nadaniu numeru PESEL.', NULL, 90, TRUE),
    ('pobyt_staly_malzenstwo', 'dokumenty_wymagane', 'Potwierdzenie opłaty 100 zł tytułem wydania karty pobytu.', NULL, 100, TRUE),
    ('pobyt_staly_malzenstwo', 'dokumenty_wymagane', 'Poprzednia karta pobytu.', NULL, 110, TRUE),
    ('pobyt_staly_malzenstwo', 'dokumenty_wymagane', 'Poprzednia decyzja o udzieleniu zezwolenia na pobyt czasowy.', NULL, 120, TRUE);

-- ============================================================================
-- Seed checklist dla kategorii: pobyt_praca
-- Źródło: dane_od_pawla/rozwinęcie v3/Praca - Checklista.docx
-- Wygenerowano automatycznie przez scripts/generate_checklist_seeds.py
-- ============================================================================

-- Idempotentność: usuń istniejące wzorce dla tej kategorii (jeśli były)
DELETE FROM gmp_checklist_definitions WHERE category_code = 'pobyt_praca';

INSERT INTO gmp_checklist_definitions (category_code, section, label, parent_label, sort_order, is_required)
VALUES
    ('pobyt_praca', 'braki_formalne', 'Wniosek', NULL, 10, TRUE),
    ('pobyt_praca', 'braki_formalne', 'Każda rubryka musi być wypełniona + podpis w ramce oraz na 8 stronie', NULL, 20, TRUE),
    ('pobyt_praca', 'braki_formalne', 'Paszport – kopie wszystkich zapisanych stron paszportu', NULL, 30, TRUE),
    ('pobyt_praca', 'braki_formalne', '4 Zdjęcia – tzw. biometryczne, czyli 3,5x4,5 cm.', NULL, 40, TRUE),
    ('pobyt_praca', 'braki_formalne', '440 zł', NULL, 50, TRUE),
    ('pobyt_praca', 'braki_formalne', 'Załącznik nr 1', NULL, 60, TRUE),
    ('pobyt_praca', 'braki_formalne', 'Każda rubryka musi być wypełniona', NULL, 70, TRUE),
    ('pobyt_praca', 'braki_formalne', 'Cz. I – dane muszą być zgodne z KRS/CEIDG', NULL, 80, TRUE),
    ('pobyt_praca', 'braki_formalne', 'Cz. I.4 PESEL i cała cz. II – musi być wszędzie NIE DOTYCZY', NULL, 90, TRUE),
    ('pobyt_praca', 'braki_formalne', 'Cz. III.1 - stanowisko musi być zwolnione z informacji starosty – jeśli nie jest to musi być informacja starosty tożsama z załącznikiem', NULL, 100, TRUE),
    ('pobyt_praca', 'braki_formalne', 'Cz. III.2 - miejsce wykonywania pracy to musi być konkretny adres, najlepiej siedziba pracodawcy z cz. I', NULL, 110, TRUE),
    ('pobyt_praca', 'braki_formalne', 'Cz. III.3 Podstawa prawna to albo UMOWA O PRACĘ albo UMOWA ZLECENIE', NULL, 120, TRUE),
    ('pobyt_praca', 'braki_formalne', 'Cz. III.4 Wymiar czasu pracy: w przypadku umowy o pracę „1/1 CAŁY ETAT”, a w przypadku zlecenia „40 GODZ. / TYDZIEŃ”. Zawsze może być wpisane mniej, ale musi zarabiać minimalną krajową', NULL, 130, TRUE),
    ('pobyt_praca', 'braki_formalne', 'Cz. III.5 Wynagrodzenie: w przypadku umowy o pracę „4.666 zł / MIESIĄC BRUTTO”, w przypadku umowy zlecenia „30,5 ZŁ / GODZ. BRUTTO” – zawsze może być więcej. To samo wpisujemy słownie', NULL, 140, TRUE),
    ('pobyt_praca', 'braki_formalne', 'Cz. III.6 – podstawowe obowiązki wpisujemy cokolwiek, byle nie było, że kucharz muruje, zdrowy rozsądek zachowujemy', NULL, 150, TRUE),
    ('pobyt_praca', 'braki_formalne', 'Cz. III.7 – okres OD taki sam jak data na str. 6, okres DO co najmniej 5 lat', NULL, 160, TRUE),
    ('pobyt_praca', 'braki_formalne', 'Oświadczenia na str. 4 – w wersji polskiej musi być zaznaczone wszędzie A', NULL, 170, TRUE),
    ('pobyt_praca', 'braki_formalne', 'Podpis na str. 6 – musi być czytelny imieniem i nazwiskiem (najlepiej z pieczątką) zgodnie z reprezentacją w KRS/CEIDG, a data taka sama jak w cz. III.7', NULL, 180, TRUE),
    ('pobyt_praca', 'braki_formalne', 'Pełnomocnictwo + 17 zł', NULL, 190, FALSE),
    ('pobyt_praca', 'braki_formalne', 'Poprzednia legalizacja np. karta pobytu lub wiza w paszporcie', NULL, 200, FALSE),
    ('pobyt_praca', 'braki_merytoryczne', 'Ubezpieczenie – nie jest potrzebne, jeśli w załączniku była wpisana umowa o pracę lub zlecenie', NULL, 210, TRUE),
    ('pobyt_praca', 'braki_merytoryczne', 'Informacja starosty – musi być zgodna z załącznikiem i wydana nie dalej jak 6 miesięcy temu. Nie jest potrzebna, jeśli', NULL, 220, TRUE),
    ('pobyt_praca', 'braki_merytoryczne', 'wniosek dotyczy obywatela Ukrainy', NULL, 230, TRUE),
    ('pobyt_praca', 'braki_merytoryczne', 'zawód wskazany w załączniku jest zwolniony z informacji starosty (patrz rozporządzenie ministra lub wojewody)', NULL, 240, TRUE),
    ('pobyt_praca', 'braki_merytoryczne', 'jest świadectwo ukończenia szkoły / dyplom ukończenia uczelni', NULL, 250, TRUE),
    ('pobyt_praca', 'braki_merytoryczne', 'jest zezwolenie na pracę typ A', NULL, 260, TRUE),
    ('pobyt_praca', 'braki_merytoryczne', 'Dokumenty dodatkowe w przypadku zawodów regulowanych', NULL, 270, TRUE),
    ('pobyt_praca', 'braki_merytoryczne', 'PESEL', NULL, 280, TRUE),
    ('pobyt_praca', 'braki_merytoryczne', 'Opłata za kartę 100 zł', NULL, 290, TRUE);

-- ============================================================================
-- Seed checklist dla kategorii: pobyt_studia
-- Źródło: dane_od_pawla/rozwinęcie v3/STUDIA Lista Audyt  .docx
-- Wygenerowano automatycznie przez scripts/generate_checklist_seeds.py
-- ============================================================================

-- Idempotentność: usuń istniejące wzorce dla tej kategorii (jeśli były)
DELETE FROM gmp_checklist_definitions WHERE category_code = 'pobyt_studia';

INSERT INTO gmp_checklist_definitions (category_code, section, label, parent_label, sort_order, is_required)
VALUES
    ('pobyt_studia', 'braki_formalne', 'Wniosek – każda rubryka musi być wypełniona lub zapis Nie dotyczy', NULL, 10, TRUE),
    ('pobyt_studia', 'braki_formalne', 'Pełnoletni – podpis w ramce oraz na 8 stronie', NULL, 20, TRUE),
    ('pobyt_studia', 'braki_formalne', 'Paszport', NULL, 30, TRUE),
    ('pobyt_studia', 'braki_formalne', '4 Zdjęcia', NULL, 40, TRUE),
    ('pobyt_studia', 'braki_formalne', '340 zł', NULL, 50, TRUE),
    ('pobyt_studia', 'braki_formalne', 'Pełnomocnictwo + 17 zł', NULL, 60, FALSE),
    ('pobyt_studia', 'braki_formalne', 'Poprzednia legalizacja np. karta pobytu', NULL, 70, FALSE),
    ('pobyt_studia', 'braki_merytoryczne', 'Aktualne Zaświadczenie o kontynuacji Studiów', NULL, 80, TRUE),
    ('pobyt_studia', 'braki_merytoryczne', 'Aktualne Zaświadczenie o niezaleganiu w opłacie czesnego', NULL, 90, TRUE),
    ('pobyt_studia', 'braki_merytoryczne', 'Aktualna Karta Osiągnięć Studenta', NULL, 100, TRUE),
    ('pobyt_studia', 'braki_merytoryczne', 'Miejsce Zamieszkania', NULL, 110, TRUE),
    ('pobyt_studia', 'braki_merytoryczne', 'Ważne', NULL, 120, TRUE),
    ('pobyt_studia', 'braki_merytoryczne', 'Czy strona jest wymieniona z Imienia i Nazwiska?', NULL, 130, TRUE),
    ('pobyt_studia', 'braki_merytoryczne', 'Czy ten sam adres co we wniosku?', NULL, 140, TRUE),
    ('pobyt_studia', 'braki_merytoryczne', 'Ubezpieczenie', NULL, 150, TRUE),
    ('pobyt_studia', 'braki_merytoryczne', 'Polisa Ubezpieczeniowa', NULL, 160, TRUE),
    ('pobyt_studia', 'braki_merytoryczne', 'Potwierdzenie opłaty za polisę', NULL, 170, TRUE),
    ('pobyt_studia', 'braki_merytoryczne', 'Zaświadczenie z Banku o środkach na koncie', NULL, 180, TRUE),
    ('pobyt_studia', 'braki_merytoryczne', 'Oświadczenie o utrzymaniu', NULL, 190, TRUE),
    ('pobyt_studia', 'braki_merytoryczne', 'Oświadczenie o kosztach', NULL, 200, TRUE),
    ('pobyt_studia', 'braki_merytoryczne', 'PESEL', NULL, 210, TRUE),
    ('pobyt_studia', 'braki_merytoryczne', 'Opłata za kartę', NULL, 220, TRUE),
    ('pobyt_studia', 'braki_merytoryczne', '50 zł', NULL, 230, TRUE);

-- ============================================================================
-- Seed checklist dla kategorii: pobyt_laczenie_ob_rp
-- Źródło: dane_od_pawla/rozwinęcie v3/ączenie obywatel RP Audyt Lista - pobyt czaoswy łdocx.docx
-- Wygenerowano automatycznie przez scripts/generate_checklist_seeds.py
-- ============================================================================

-- Idempotentność: usuń istniejące wzorce dla tej kategorii (jeśli były)
DELETE FROM gmp_checklist_definitions WHERE category_code = 'pobyt_laczenie_ob_rp';

INSERT INTO gmp_checklist_definitions (category_code, section, label, parent_label, sort_order, is_required)
VALUES
    ('pobyt_laczenie_ob_rp', 'dokumenty_wymagane', 'WYMAGANE DOKUMENTY DO SPRAWY O POBYT CZASOWY', NULL, 10, TRUE),
    ('pobyt_laczenie_ob_rp', 'dokumenty_wymagane', 'Formularz wniosku o pobyt czasowy.', NULL, 20, TRUE),
    ('pobyt_laczenie_ob_rp', 'dokumenty_wymagane', '4 zdjęcia – kolorowe, 35 mm x 45 mm, paszportowe, do karty pobytu.', NULL, 30, TRUE),
    ('pobyt_laczenie_ob_rp', 'dokumenty_wymagane', 'Kserokopia paszportu.', NULL, 40, TRUE),
    ('pobyt_laczenie_ob_rp', 'dokumenty_wymagane', 'Opłata 340 zł za wniosek.', NULL, 50, TRUE),
    ('pobyt_laczenie_ob_rp', 'dokumenty_wymagane', 'Dowód osobisty Pana/Pani żony/męża lub paszport.', NULL, 60, TRUE),
    ('pobyt_laczenie_ob_rp', 'dokumenty_wymagane', 'Akt małżeństwa wydany przez polski Urząd Stanu Cywilnego – maksymalna ważność 3 miesiące od daty wydania.', NULL, 70, TRUE),
    ('pobyt_laczenie_ob_rp', 'dokumenty_wymagane', 'Powiadomienie o nadaniu numeru PESEL.', NULL, 80, TRUE),
    ('pobyt_laczenie_ob_rp', 'dokumenty_wymagane', 'Opłata 100 zł za kartę pobytu.', NULL, 90, TRUE),
    ('pobyt_laczenie_ob_rp', 'dokumenty_wymagane', 'Poprzednia karta pobytu czasowego', NULL, 100, TRUE),
    ('pobyt_laczenie_ob_rp', 'dokumenty_wymagane', 'Poprzednia decyzja pobytowa', NULL, 110, TRUE);

-- ============================================================================
-- Seed checklist dla kategorii: rezydent
-- Źródło: dane_od_pawla/rozwinęcie v3/rezydent- lista.docx
-- Wygenerowano automatycznie przez scripts/generate_checklist_seeds.py
-- ============================================================================

-- Idempotentność: usuń istniejące wzorce dla tej kategorii (jeśli były)
DELETE FROM gmp_checklist_definitions WHERE category_code = 'rezydent';

INSERT INTO gmp_checklist_definitions (category_code, section, label, parent_label, sort_order, is_required)
VALUES
    ('rezydent', 'dokumenty_wymagane', 'Lista dokumentów do wniosku o udzielenie zezwolenia na pobyt rezydenta długoterminowego Unii Europejskiej- dla osoby pracującej', NULL, 10, TRUE),
    ('rezydent', 'dokumenty_wymagane', 'kopia wszystkich zapisanych stron paszportu cudzoziemca', NULL, 20, TRUE),
    ('rezydent', 'dokumenty_wymagane', 'pierwsza strona x4', NULL, 30, TRUE),
    ('rezydent', 'dokumenty_wymagane', 'kolejne strony x2', NULL, 40, TRUE),
    ('rezydent', 'dokumenty_wymagane', 'jeśli posiada to również poprzedniego paszportu', NULL, 50, TRUE),
    ('rezydent', 'dokumenty_wymagane', 'kopia decyzji pobytowych oraz kart pobytu za ostatnie 5 lat', NULL, 60, TRUE),
    ('rezydent', 'dokumenty_wymagane', 'jeśli nie ma decyzji to najlepiej uzyskać duplikaty,', NULL, 70, TRUE),
    ('rezydent', 'dokumenty_wymagane', 'jeśli nie ma kart pobytu to trudno (dobrze jak są, ale nie są niezbędne)', NULL, 80, TRUE),
    ('rezydent', 'dokumenty_wymagane', '3)  umowa najmu lokalu mieszkalnego/akt notarialny', NULL, 90, TRUE),
    ('rezydent', 'dokumenty_wymagane', 'nie może być użyczenie', NULL, 100, TRUE),
    ('rezydent', 'dokumenty_wymagane', 'jeśli umowa najmu to również oświadczenie właściciela dot. własności lub wypis z rejestru ksiąg wieczystych (zasada jak przy czasówce)', NULL, 110, TRUE),
    ('rezydent', 'dokumenty_wymagane', 'można złożyć wniosek jeszcze bez certyfikatu, jeśli klient ma zdany egzamin (aktualnie na certyfikat czeka się nawet kilka miesięcy)', NULL, 130, TRUE),
    ('rezydent', 'dokumenty_wymagane', '5) aktualna umowa o pracę/zlecenie wraz z dokumentem zezwalającym na legalne wykonywanie pracy (np. oświadczenie, zezwolenie, decyzja) lub dokumentem zwalniającym z konieczności posiadania zezwolenia na pracę', NULL, 140, TRUE),
    ('rezydent', 'dokumenty_wymagane', '6) poprzednie umowy o pracę/zlecenia wraz z dokumentami zezwalającymi na legalne wykonywanie pracy (np. oświadczenie, zezwolenie, decyzja) lub dokumentem zwalniającym z konieczności posiadania zezwolenia na pracę', NULL, 150, TRUE),
    ('rezydent', 'dokumenty_wymagane', 'najważniejsze są ostatnie 3 lata od momentu złożenia wniosku- tutaj wszystko musi być idealnie i legalnie, ale warto poprosić o dokumentacje z 5 lat (czasem mogą wezwać, więc lepiej się zabezpieczyć)', NULL, 160, TRUE),
    ('rezydent', 'dokumenty_wymagane', '7) zaświadczenie ZUS o historii ubezpieczenia, podstawach składek oraz płatnikach', NULL, 170, TRUE),
    ('rezydent', 'dokumenty_wymagane', 'w tym zaświadczeniu sprawdzamy przede wszystkim ciągłość ubezpieczenia, jeśli są jakieś luki to trzeba wyjaśnić z klientem, tak samo jakby podstawa opodatkowania byłaby na tyle niska, że nie osiągałby minimum', NULL, 190, TRUE),
    ('rezydent', 'dokumenty_wymagane', '8) aktualne potwierdzenie ubezpieczenia', NULL, 210, TRUE),
    ('rezydent', 'dokumenty_wymagane', 'ZUS ZUA wraz z podpisem i pieczątką płatnika', NULL, 220, TRUE),
    ('rezydent', 'dokumenty_wymagane', 'lub inna prywatna polisa ubezpieczeniowa pokrywająca koszty hospitalizacji na terytorium RP', NULL, 230, TRUE),
    ('rezydent', 'dokumenty_wymagane', 'ZUS IMIR za ostatnie 3 miesiące z podpisem i pieczątką płatnika', NULL, 240, TRUE),
    ('rezydent', 'dokumenty_wymagane', '9) zaświadczenie o niezaleganiu w podatkach- z Urzędu Skarbowego', NULL, 250, TRUE),
    ('rezydent', 'dokumenty_wymagane', '10) rozliczenia PIT-37 wraz z UPO za ostatnie 3 lata od daty złożenia wniosku', NULL, 260, TRUE),
    ('rezydent', 'dokumenty_wymagane', 'w PIT należy sprawdzić, czy w każdym roku podatkowym zostało osiągnięty minimalny dochód dla wnioskodawcy oraz wszystkich osób na jego utrzymaniu + czy są zgodne w umowami (czy np. na umowach jest znacznie więcej a PIT niższy, albo odwrotnie)', NULL, 270, TRUE),
    ('rezydent', 'dokumenty_wymagane', '9) akt małżeństwa wraz z tłumaczeniem przysięgłym (tłumaczenie wykonane przez   polskiego tłumacza przysięgłego wpisanego na listę tłumaczy przysięgłych Ministerstwa Sprawiedliwości + dopisek, że tłumaczenie zostało wykonane z oryginału dokumentu)', NULL, 280, TRUE),
    ('rezydent', 'dokumenty_wymagane', 'PIT-37 małżonka za ostatnie 3 lata wraz z dokumentem potwierdzającym możliwość legalnego wykonywania pracy', NULL, 290, TRUE),
    ('rezydent', 'dokumenty_wymagane', 'tylko dla osób w związku małżeńskim', NULL, 300, TRUE),
    ('rezydent', 'dokumenty_wymagane', '10) oświadczenie o ilości osób na utrzymaniu', NULL, 310, TRUE),
    ('rezydent', 'dokumenty_wymagane', '11) opłata 640 zł od wniosku oraz 100 zł za kartę pobytu (dla dzieci 50 zł za kartę, wniosek w jednej cenie)', NULL, 320, TRUE),
    ('rezydent', 'dokumenty_wymagane', '12) 4 fotografie biometryczne', NULL, 330, TRUE),
    ('rezydent', 'dokumenty_wymagane', '13) lista wyjazdów w okresie 5 lat przed złożeniem wniosku', NULL, 340, TRUE);

-- ============================================================================
-- Seed checklist dla kategorii: wymiana_karty
-- Źródło: dane_od_pawla/rozwinęcie v3/wydanie wymian karty pobytu.  Lista - audyt docx.docx
-- Wygenerowano automatycznie przez scripts/generate_checklist_seeds.py
-- ============================================================================

-- Idempotentność: usuń istniejące wzorce dla tej kategorii (jeśli były)
DELETE FROM gmp_checklist_definitions WHERE category_code = 'wymiana_karty';

INSERT INTO gmp_checklist_definitions (category_code, section, label, parent_label, sort_order, is_required)
VALUES
    ('wymiana_karty', 'dokumenty_wymagane', 'Formularz wniosku o wymianę karty – do wypełnienia u nas w Kancelarii.', NULL, 10, TRUE),
    ('wymiana_karty', 'dokumenty_wymagane', '2 aktualne fotografie – 45mm x 35 mm, kolorowe, zdjęcia paszportowe, zdjęcia do karty pobytu.', NULL, 20, TRUE),
    ('wymiana_karty', 'dokumenty_wymagane', 'Kserokopia paszportu – do zrobienia u nas w Kancelarii.', NULL, 30, TRUE),
    ('wymiana_karty', 'dokumenty_wymagane', 'Opłata w wysokości 100 zł za wymianę karty pobytu.', NULL, 40, TRUE),
    ('wymiana_karty', 'dokumenty_wymagane', 'Decyzja pobytowa.', NULL, 50, TRUE),
    ('wymiana_karty', 'dokumenty_wymagane', 'Poprzednia karta pobytu – kopia do zrobienia u nas w biurze.', NULL, 60, TRUE),
    ('wymiana_karty', 'dokumenty_wymagane', 'Powiadomienie o nadaniu numeru PESEL – dokument z Urzędu Gminy/Miasta/Miasta i Gminy/Miejskiego, potwierdzający posiadanie numeru PESEL.', NULL, 70, TRUE),
    ('wymiana_karty', 'dokumenty_wymagane', 'Inne dokumenty potwierdzające dane we wniosku.', NULL, 80, TRUE);

-- ============================================================================
-- Seed checklist dla kategorii: pobyt_laczenie_rodzina
-- Źródło: dane_od_pawla/rozwinęcie v3/ŁĄCZENIE z rodziną Lista Audyt  .docx
-- Wygenerowano automatycznie przez scripts/generate_checklist_seeds.py
-- ============================================================================

-- Idempotentność: usuń istniejące wzorce dla tej kategorii (jeśli były)
DELETE FROM gmp_checklist_definitions WHERE category_code = 'pobyt_laczenie_rodzina';

INSERT INTO gmp_checklist_definitions (category_code, section, label, parent_label, sort_order, is_required)
VALUES
    ('pobyt_laczenie_rodzina', 'braki_formalne', 'Wniosek – każda rubryka musi być wypełniona lub zapis Nie dotyczy', NULL, 10, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_formalne', 'Pełnoletni – podpis w ramce oraz na 8 stronie', NULL, 20, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_formalne', 'Małoletni powyżej 13 lat – podpis małoletniego w ramce + rodzica z którym łączymy pod wnioskiem', NULL, 30, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_formalne', 'Małoletni poniżej 13 lat – pusta ramka + podpis rodzica z którym łączymy pod wnioskiem', NULL, 40, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_formalne', 'Paszport', NULL, 50, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_formalne', '4 Zdjęcia', NULL, 60, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_formalne', '340 zł', NULL, 70, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_formalne', 'Pełnomocnictwo + 17 zł', NULL, 80, FALSE),
    ('pobyt_laczenie_rodzina', 'braki_formalne', 'Poprzednia legalizacja np. karta pobytu', NULL, 90, FALSE),
    ('pobyt_laczenie_rodzina', 'braki_merytoryczne', 'Paszport', NULL, 100, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_merytoryczne', 'Paszport Strony', NULL, 110, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_merytoryczne', 'Paszport osoby, z którą łączymy', NULL, 120, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_merytoryczne', 'w przypadku małoletniego', NULL, 130, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_merytoryczne', 'Akt urodzenia', NULL, 140, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_merytoryczne', 'Tłumaczenie przysięgłe', NULL, 150, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_merytoryczne', 'w przypadku małżeństwa', NULL, 160, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_merytoryczne', 'Akt małżeństwa', NULL, 170, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_merytoryczne', 'Tłumaczenie przysięgłe', NULL, 180, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_merytoryczne', 'Oświadczenie kto kogo utrzymuje', NULL, 190, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_merytoryczne', 'Decyzja osoby, z którą łączymy', NULL, 200, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_merytoryczne', 'Miejsce zamieszkania', NULL, 210, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_merytoryczne', 'Ważne', NULL, 220, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_merytoryczne', 'Czy strona jest wymieniona?', NULL, 230, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_merytoryczne', 'Czy ten sam adres co we wniosku?', NULL, 240, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_merytoryczne', 'Ubezpieczenie', NULL, 250, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_merytoryczne', 'ZUS P ZCNA – musi być podpisany + pieczątka firmy', NULL, 260, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_merytoryczne', 'lub polisa ubezpieczeniowa', NULL, 270, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_merytoryczne', 'Dochód', NULL, 280, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_merytoryczne', 'Ważna umowa o pracę', NULL, 290, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_merytoryczne', 'Ważna umowa zlecenie + zaświadczenie o zarobkach', NULL, 300, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_merytoryczne', 'PESEL', NULL, 310, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_merytoryczne', 'Opłata za kartę', NULL, 320, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_merytoryczne', '100 zł', NULL, 330, TRUE),
    ('pobyt_laczenie_rodzina', 'braki_merytoryczne', '50 zł', NULL, 340, TRUE);

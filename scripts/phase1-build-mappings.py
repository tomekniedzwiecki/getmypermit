"""
Faza 1 Dzien 1 cd: Tworzy kanoniczne mapping-i do importu.
Wynik: dane_od_pawla/_preview/_mappings/ - JSON-y gotowe do uzycia w skryptach importu.
"""
from pathlib import Path
import json
import re

DANE = Path(__file__).parent.parent / "dane_od_pawla"
UNIQUE = DANE / "_preview" / "_unique"
MAPPINGS = DANE / "_preview" / "_mappings"
MAPPINGS.mkdir(parents=True, exist_ok=True)

def load_unique(name):
    return json.loads((UNIQUE / f"{name}.json").read_text(encoding="utf-8"))


# ==============================================================
# 1. STAFF MAPPING (D6: sensownie polacz)
# ==============================================================
# Kanoniczne osoby kancelarii z aliasami (imion/nazwisk)
STAFF = [
    {
        "full_name": "Julia",
        "role": "staff",
        "email": None,
        "aliases": ["Julia", "JULIA", "JULKA"],  # JULKA z innych arkuszy moze byc dopisane
    },
    {
        "full_name": "Wiktoria",
        "role": "staff",
        "aliases": ["Wiktoria", "WIKTORIA"],
    },
    {
        "full_name": "Michał Kuźniar",
        "role": "staff",
        "aliases": ["MICHAŁ KUŹNIAR", "M.KUŻNIAR", "Michał Kuźniar", "MICHAŁ KUŹ"],
    },
    {
        "full_name": "Michał Kukielka",
        "role": "staff",
        "aliases": ["M.KUKIELKA", "MICHAŁ KUK.", "MICHAŁ KUKIELKA", "Michał Kukielka"],
    },
    {
        "full_name": "Oleksandr",
        "role": "staff",
        "aliases": ["OLEKSANDR", "Oleksandr", "OLEKSANDER"],
    },
    {
        "full_name": "Marta",
        "role": "staff",
        "aliases": ["Marta", "MARTA", "marta"],
    },
    {
        "full_name": "Paweł",
        "role": "admin",  # wlasciciel kancelarii
        "aliases": ["PAWEŁ", "Paweł"],
    },
    {
        "full_name": "Mateusz Lis",
        "role": "staff",
        "aliases": ["MATEUSZ LIS"],
    },
    {
        "full_name": "Karol",
        "role": "staff",
        "aliases": ["KAROL"],
    },
    {
        "full_name": "Natalia",
        "role": "staff",
        "aliases": ["NATALIA"],
    },
    {
        "full_name": "Michał",
        "role": "staff",
        "aliases": ["Michał"],
        "note": "Moze byc Kuźniar albo Kukielka - osobny rekord do wyjasnienia",
    },
    {
        "full_name": "Olha Kovalova",
        "role": "staff",
        "aliases": ["OLHA KOVALOVA"],
        "note": "Wystepuje w ODCISKI/SKLADANE WNIOSKI jako OPIEKUN",
    },
]

# Build lookup: alias (upper-case, bez diacritics) -> full_name
def norm(s):
    if not s: return ""
    # remove polish diacritics for matching
    import unicodedata
    n = unicodedata.normalize('NFD', s)
    n = ''.join(c for c in n if unicodedata.category(c) != 'Mn')
    return n.upper().strip()

staff_lookup = {}
for person in STAFF:
    for alias in person["aliases"]:
        staff_lookup[norm(alias)] = person["full_name"]

# Zapisz
(MAPPINGS / "staff.json").write_text(
    json.dumps({
        "staff": STAFF,
        "alias_lookup": staff_lookup,
    }, ensure_ascii=False, indent=2),
    encoding="utf-8"
)

# Specjalne case: "WIKTORIA/MICHAŁ KUŹNIAR" -> obie osoby assigned
# (obsluzymy w imporcie: string zawiera "/" -> split + multiple activity entries)


# ==============================================================
# 2. STAGES MAPPING (D7: mapuj na enum, reszta -> notes)
# ==============================================================
# Enum wartosci z schema:
STAGE_ENUM = [
    "weryfikacja_dokumentow",
    "zlozenie_wniosku",
    "oczekiwanie_na_osobiste",
    "wyznaczono_termin",
    "po_osobistym",
    "oczekiwanie_na_decyzje",
    "zakonczenie",
    "odwolanie",
    "umorzenie",
    "przystapienie",  # dodatkowy dla D "Przystąpienie"
]

# Pattern -> stage (case insensitive substring)
STAGE_PATTERNS = [
    # Złożenie wniosku
    (r"wniosek złożony|złożenie wniosku|rejestracja wniosku|rejestracja w udsc", "zlozenie_wniosku"),
    # Osobiste
    (r"wezwanie na osobiste|osobiste w duw", "wyznaczono_termin"),
    (r"po osobistym", "po_osobistym"),
    # Uzupełnianie dokumentów
    (r"uzupełniamy braki formalne|uzupełniamy dokumenty|wezwanie|kompletowanie dokumentów|10.kpa|10 kpa|ostatnie uzupełnienie", "weryfikacja_dokumentow"),
    # Odwołania
    (r"odwołanie|rozpatrywane odwołanie|cofamy.*skargę|skarga|wsa", "odwolanie"),
    # Umorzenia
    (r"umarzają wniosek|umorzenie|zamykać.*wniosek|zamknięcie sprawy", "umorzenie"),
    # Przystąpienia
    (r"^przystąpienie$", "przystapienie"),
    # Wszczęcie = złożenie + weryfikacja
    (r"wszczęcie postępowania", "zlozenie_wniosku"),
    # Czekanie na decyzję
    (r"czekamy na decyzję|komplet dokumentów", "oczekiwanie_na_decyzje"),
    # Przeniesienie
    (r"przekazani.*|przekazanie", "zlozenie_wniosku"),  # po przekazaniu
]

stages_data = load_unique("stages")
stage_mapping = []
for item in stages_data["values"]:
    value = item["value"]
    matched_stage = None
    for pattern, stage in STAGE_PATTERNS:
        if re.search(pattern, value.lower()):
            matched_stage = stage
            break
    stage_mapping.append({
        "source_value": value,
        "count": item["count"],
        "mapped_stage": matched_stage,
        "fallback_to_notes": matched_stage is None,
    })

(MAPPINGS / "stages.json").write_text(
    json.dumps({
        "enum": STAGE_ENUM,
        "patterns": [(p, s) for p, s in STAGE_PATTERNS],
        "mapping": stage_mapping,
        "stats": {
            "total_unique": len(stage_mapping),
            "matched": sum(1 for m in stage_mapping if m["mapped_stage"]),
            "fallback": sum(1 for m in stage_mapping if m["fallback_to_notes"]),
        }
    }, ensure_ascii=False, indent=2),
    encoding="utf-8"
)


# ==============================================================
# 3. STATUSES MAPPING
# ==============================================================
STATUS_MAPPING = {
    "AKTYWNA": "aktywna",
    "ZAKOŃCZONA": "zakonczona",
    "ZAKOŃCZONE": "zakonczona",
    "ZAKOŃCZONA-UMORZENIE": "zakonczona",  # + stage=umorzenie w imporcie
}
(MAPPINGS / "statuses.json").write_text(
    json.dumps(STATUS_MAPPING, ensure_ascii=False, indent=2),
    encoding="utf-8"
)


# ==============================================================
# 4. SUBMISSION METHODS MAPPING
# ==============================================================
SUBMISSION_METHOD_MAPPING = {
    "OSOBIŚCIE": "osobiscie",
    "OSOBIŚCIE (PRZYŁĄCZENIE)": "osobiscie",  # + kind=przystapienie_do_sprawy
    "POCZTA": "pocztowo",
    "BRAK": None,
    # Dodatkowe ktore moga pojawic sie w POBYT (tam nie ma kolumny METODA ale jest w POZOSTALE/REZYDENT):
}
(MAPPINGS / "submission_methods.json").write_text(
    json.dumps(SUBMISSION_METHOD_MAPPING, ensure_ascii=False, indent=2),
    encoding="utf-8"
)


# ==============================================================
# 5. CASE_TYPES - NORMALIZACJA
# ==============================================================
# Glowne kategorie zachowujemy jako wartosci text.
# Budujemy tylko funkcje normalizujaca: uppercase + trim.
case_types_data = load_unique("case_types")
MAIN_CASE_TYPES = [
    "PRACA", "ŁĄCZENIE", "REZYDENT DŁUGOTERMINOWY UE", "REZYDENT UE",
    "OBYWATELSTWO", "POBYT STAŁY", "DZIAŁALNOŚĆ GOSPODARCZA",
    "WYMIANA KARTY POBYTU", "STUDIA", "STUDENT", "ZEZWOLENIE TYP A",
]
# Zapisujemy do decyzji w Fazie 2
(MAPPINGS / "case_types.json").write_text(
    json.dumps({
        "main_types": MAIN_CASE_TYPES,
        "top_20": case_types_data["values"][:20],
        "total_unique": len(case_types_data["values"]),
        "normalization": "uppercase + trim, zostawiamy jako text w cases.case_type",
    }, ensure_ascii=False, indent=2),
    encoding="utf-8"
)


# ==============================================================
# 6. INSPECTORS - FILTROWANIE (usuniecie "PC 2" itp.)
# ==============================================================
inspectors_data = load_unique("inspectors")
BAD_INSPECTOR_PATTERNS = [
    r"^pc\s*\d+$",          # "PC 2", "PC 4"
    r"^\?+$",               # "?", "??"
    r"^\s*$",               # puste
    r"^oc\s?ii$",           # OC II (oddzial, nie inspektor)
    r"^oc\s?\d+$",
    r"^due$", r"^op$", r"^ocii$",
]
bad_re = re.compile("|".join(BAD_INSPECTOR_PATTERNS), re.IGNORECASE)
real_inspectors = []
skipped_inspectors = []
for item in inspectors_data["values"]:
    if bad_re.match(item["value"].strip()):
        skipped_inspectors.append(item)
    else:
        real_inspectors.append(item)
(MAPPINGS / "inspectors.json").write_text(
    json.dumps({
        "real": real_inspectors,
        "skipped": skipped_inspectors,
        "stats": {
            "total_unique": len(inspectors_data["values"]),
            "real_count": len(real_inspectors),
            "skipped_count": len(skipped_inspectors),
        }
    }, ensure_ascii=False, indent=2),
    encoding="utf-8"
)


# ==============================================================
# 7. OFFICES (urzedy)
# ==============================================================
# Na podstawie znajomosci domeny: 4 glowne urzedy + centra rejestracji
OFFICES = [
    {"name": "Dolnośląski Urząd Wojewódzki we Wrocławiu", "city": "WROCŁAW", "code": "DUW_WROCLAW"},
    {"name": "ŚUW Wałbrzych", "city": "WAŁBRZYCH", "code": "SUW_WALBRZYCH"},
    {"name": "ŚUW Legnica", "city": "LEGNICA", "code": "SUW_LEGNICA"},
    {"name": "UDSC", "city": "WARSZAWA", "code": "UDSC"},
    {"name": "Placówka Bolesławiec", "city": "BOLESŁAWIEC", "code": "BOLESLAWIEC"},
]
# Oddziały (PC 1-4, OC II, DUE, OP, OBYWATELSTWO) - tutaj "Oddział" w danych
OFFICE_DEPARTMENTS = [
    # Główne oddziały w DUW Wrocław
    {"office_code": "DUW_WROCLAW", "code": "PC 1", "name": "Punkt Cudzoziemców 1"},
    {"office_code": "DUW_WROCLAW", "code": "PC 2", "name": "Punkt Cudzoziemców 2"},
    {"office_code": "DUW_WROCLAW", "code": "PC 3", "name": "Punkt Cudzoziemców 3"},
    {"office_code": "DUW_WROCLAW", "code": "PC 4", "name": "Punkt Cudzoziemców 4"},
    {"office_code": "DUW_WROCLAW", "code": "OC II", "name": "Oddział Cudzoziemców II"},
    {"office_code": "DUW_WROCLAW", "code": "DUE", "name": "Rezydenci UE"},
    {"office_code": "DUW_WROCLAW", "code": "OP", "name": "Oddział Pobytu"},
    {"office_code": "DUW_WROCLAW", "code": "OCII", "name": "Oddział Cudzoziemców II (OCII)"},
    {"office_code": "DUW_WROCLAW", "code": "OBYWATELSTWO", "name": "Oddział Obywatelstwa"},
]
(MAPPINGS / "offices.json").write_text(
    json.dumps({
        "offices": OFFICES,
        "departments": OFFICE_DEPARTMENTS,
    }, ensure_ascii=False, indent=2),
    encoding="utf-8"
)


# ==============================================================
# 8. CATEGORY (POBYT / POZOSTAŁE / REZYDENT / etc)
# ==============================================================
CATEGORY_MAPPING = {
    "POBYT": "pobyt",
    "POZOSTAŁE": "pozostale",
    "REZYDENT": "rezydent",
    "ZEZWOLENIA TYP A": "zezwolenie_a",
    "Odebrane decyzje": "decyzja_historyczna",
    "Smart Work": "smart_work",
    "Ewidencja spotkań": "lead_ewidencja",
    "ROZLICZENIA": "rozliczenie_historyczne",
}
(MAPPINGS / "categories.json").write_text(
    json.dumps(CATEGORY_MAPPING, ensure_ascii=False, indent=2),
    encoding="utf-8"
)


# ==============================================================
# PODSUMOWANIE
# ==============================================================
print("=" * 70)
print("MAPPINGS CREATED")
print("=" * 70)
print(f"\n[STAFF] Kanoniczne osoby kancelarii: {len(STAFF)}")
for p in STAFF:
    aliases = ", ".join(p["aliases"][:3])
    more = f" +{len(p['aliases']) - 3}" if len(p["aliases"]) > 3 else ""
    print(f"  - {p['full_name']:20s} ({p['role']:7s}) aliasy: {aliases}{more}")

print(f"\n[STAGES] Mapowanie etapow:")
stages_stats = json.loads((MAPPINGS / "stages.json").read_text(encoding="utf-8"))["stats"]
print(f"  {stages_stats['total_unique']} unikalnych -> {stages_stats['matched']} zmapowanych, {stages_stats['fallback']} do notes")

print(f"\n[INSPECTORS] Filtrowanie:")
insp_stats = json.loads((MAPPINGS / "inspectors.json").read_text(encoding="utf-8"))["stats"]
print(f"  {insp_stats['total_unique']} unikalnych -> {insp_stats['real_count']} realnych, {insp_stats['skipped_count']} odrzuconych (PC X, ? itp.)")

print(f"\n[OFFICES] {len(OFFICES)} urzedow, {len(OFFICE_DEPARTMENTS)} oddzialow")
print(f"\n[STATUSES] {len(STATUS_MAPPING)} unique -> 3 enum values (lead zachowamy dla ewidencji)")
print(f"\n[SUBMISSION_METHODS] {len(SUBMISSION_METHOD_MAPPING)} unique")
print(f"\n[CATEGORIES] {len(CATEGORY_MAPPING)} kategorii spraw")

print(f"\nWszystkie mappingi zapisane w: dane_od_pawla/_preview/_mappings/")

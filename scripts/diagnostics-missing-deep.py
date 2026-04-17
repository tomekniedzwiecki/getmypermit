"""
Dokladna analiza "pustych" wierszy - co faktycznie tam jest?
"""
import numbers_parser.cell as _np_cell
from numbers_parser.cell import Cell, TextCell
_orig = Cell._from_storage
def _safe(t, r, c, b, m):
    try: return _orig(t, r, c, b, m)
    except: return TextCell(r, c, "<err>")
Cell._from_storage = staticmethod(_safe)

from numbers_parser import Document
from pathlib import Path
import unicodedata

DANE = Path(__file__).parent.parent / "dane_od_pawla"
def find_file(frag):
    for p in DANE.iterdir():
        if frag.lower() in unicodedata.normalize('NFC', p.name).lower():
            return p

def val(cell):
    try:
        v = cell.value
        return str(v).strip() if v is not None else ""
    except: return ""

doc = Document(str(find_file("Rejestr- karty pobytu")))

for sheet_name in ["POZOSTAŁE", "REZYDENT"]:
    print(f"\n{'='*70}\n{sheet_name}\n{'='*70}")
    for sheet in doc.sheets:
        if sheet.name != sheet_name: continue
        for table in sheet.tables:
            n_rows, n_cols = table.num_rows, table.num_cols
            headers = [val(table.cell(0, c)) for c in range(n_cols)]
            col_naz = headers.index('NAZWISKO')
            col_imie = headers.index('IMIĘ')

            # Klasyfikuj "puste" wiersze
            classes = {
                "truly_empty": 0,           # wszystkie kolumny puste
                "only_rodzaj": 0,           # tylko RODZAJ SPRAWY
                "has_nr_sprawy": 0,         # ma NUMER SPRAWY albo ZNAK SPRAWY
                "has_other": 0,             # ma inne pola oprocz RODZAJ
            }
            examples_by_class = {k: [] for k in classes}

            for r in range(3, n_rows):
                last = val(table.cell(r, col_naz))
                first = val(table.cell(r, col_imie))
                if last or first: continue

                # Sprawdz wszystkie kolumny
                non_empty = {}
                for c in range(n_cols):
                    v = val(table.cell(r, c))
                    if v:
                        h = headers[c] if c < len(headers) and headers[c] else f"col{c}"
                        non_empty[h] = v

                if not non_empty:
                    classes["truly_empty"] += 1
                elif "NUMER SPRAWY" in str(non_empty.keys()) or any("NUMER" in k or "ZNAK" in k for k in non_empty.keys()):
                    classes["has_nr_sprawy"] += 1
                    if len(examples_by_class["has_nr_sprawy"]) < 3:
                        examples_by_class["has_nr_sprawy"].append(f"row {r}: {dict(list(non_empty.items())[:6])}")
                elif set(non_empty.keys()) <= {"RODZAJ SPRAWY", "RODZAJ SPRAWY "}:
                    classes["only_rodzaj"] += 1
                else:
                    classes["has_other"] += 1
                    if len(examples_by_class["has_other"]) < 3:
                        examples_by_class["has_other"].append(f"row {r}: {dict(list(non_empty.items())[:6])}")

            total = sum(classes.values())
            print(f"  Klasyfikacja 'pustych' wierszy (razem {total}):")
            for k, v in classes.items():
                pct = 100 * v / total if total > 0 else 0
                print(f"    {k:20s} {v:5d} ({pct:.1f}%)")
            if examples_by_class["has_nr_sprawy"]:
                print(f"\n  Przyklady z NUMER SPRAWY / ZNAK:")
                for ex in examples_by_class["has_nr_sprawy"]:
                    print(f"    {ex}")
            if examples_by_class["has_other"]:
                print(f"\n  Przyklady z innymi polami:")
                for ex in examples_by_class["has_other"]:
                    print(f"    {ex}")

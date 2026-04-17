"""
Diagnostyka: dlaczego tak duzo wierszy bylo "skipped_empty" w POBYT/POZOSTALE/REZYDENT.
Sprawdzamy czy rzeczywiscie bylo puste, czy moze zrobilem bledny offset/mapping.
"""
import numbers_parser.cell as _np_cell
from numbers_parser.cell import Cell, TextCell
_orig = Cell._from_storage
def _safe(table_id, row, col, buffer, model):
    try: return _orig(table_id, row, col, buffer, model)
    except: return TextCell(row, col, "<err>")
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

path = find_file("Rejestr- karty pobytu")
doc = Document(str(path))

for sheet_name in ["POBYT", "POZOSTAŁE", "REZYDENT"]:
    print(f"\n{'='*70}")
    print(f"ARKUSZ: {sheet_name}")
    print('='*70)
    for sheet in doc.sheets:
        if sheet.name != sheet_name: continue
        for table in sheet.tables:
            n_rows = table.num_rows
            n_cols = table.num_cols
            print(f"  Tabela {table.name}: {n_rows} wierszy x {n_cols} kolumn")

            # Znajdz index kolumn NAZWISKO i IMIE w row 0
            headers_row0 = [val(table.cell(0, c)) for c in range(n_cols)]
            try:
                col_nazwisko = headers_row0.index('NAZWISKO')
                col_imie = headers_row0.index('IMIĘ')
                print(f"  NAZWISKO col={col_nazwisko}, IMIĘ col={col_imie}")
            except ValueError as e:
                print(f"  Nie znaleziono NAZWISKO/IMIE w row 0: {headers_row0[:10]}")
                continue

            # Policz rows z NAZWISKO niepustym w roznych start_row
            stats = {}
            for start in [1, 2, 3]:
                empty = 0
                filled = 0
                for r in range(start, n_rows):
                    last = val(table.cell(r, col_nazwisko))
                    first = val(table.cell(r, col_imie))
                    if not last and not first:
                        empty += 1
                    else:
                        filled += 1
                stats[start] = (filled, empty)
            print(f"  Od row 1: {stats[1][0]} wypelnionych, {stats[1][1]} pustych")
            print(f"  Od row 2: {stats[2][0]} wypelnionych, {stats[2][1]} pustych")
            print(f"  Od row 3: {stats[3][0]} wypelnionych, {stats[3][1]} pustych")

            # Pokaz 5 losowych 'pustych' wierszy - co tam naprawde jest
            print(f"\n  Przyklady wierszy z pustym NAZWISKO+IMIE (od row 3):")
            shown = 0
            for r in range(3, n_rows):
                last = val(table.cell(r, col_nazwisko))
                first = val(table.cell(r, col_imie))
                if not last and not first:
                    # Pokaz wszystkie niepuste pola
                    non_empty = []
                    for c in range(n_cols):
                        v = val(table.cell(r, c))
                        if v:
                            hdr = headers_row0[c] if c < len(headers_row0) else f"col{c}"
                            non_empty.append(f"{hdr[:15]}={v[:30]}")
                    if non_empty:
                        print(f"    row {r}: {' | '.join(non_empty[:6])}")
                        shown += 1
                    if shown >= 5:
                        break
            if shown == 0:
                print(f"    (wszystkie 'puste' wiersze sa faktycznie 100% puste)")

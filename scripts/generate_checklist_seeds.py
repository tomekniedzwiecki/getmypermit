"""
Konwertuje 11 list audytowych Pawła z .docx do SQL seed migracji
gmp_checklist_definitions.

Mapowanie plik → kategoria (po naszych prawdziwych nazwach z bazy):
"""
import sys, os, re, json
sys.stdout.reconfigure(encoding='utf-8')

from docx import Document

PAWEL_DIR = r'c:\tmp\pawel_docs'
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'supabase', 'migrations')

# Mapping: doc_XX.docx (ASCII alias) → category_code w naszej bazie
MAPPING = {
    'doc_02.docx': 'pobyt_spolka',           # "Działność Pobyt spółka Lista Audyt"
    'doc_03.docx': 'pobyt_jdg_ukr',          # "Dziąłnośc gosp Lista audyt - CEIDG UKR"
    'doc_05.docx': 'pobyt_konkubinat',       # "Konkubinat Lista Audyt"
    'doc_06.docx': 'pobyt_staly_karta_polaka',  # "POBYT STAŁY KARTA POLAKA"
    'doc_07.docx': 'pobyt_staly_malzenstwo', # "POBYT STAŁY MAŁŻEŃSTWO"
    'doc_09.docx': 'pobyt_praca',            # "Praca - Checklista"
    'doc_10.docx': 'pobyt_studia',           # "STUDIA Lista Audyt"
    'doc_11.docx': 'pobyt_laczenie_ob_rp',   # "ączenie obywatel RP Audyt Lista"
    'doc_13.docx': 'rezydent',               # "rezydent- lista"
    'doc_15.docx': 'wymiana_karty',          # "wydanie wymian karty pobytu"
    'doc_16.docx': 'pobyt_laczenie_rodzina', # "ŁĄCZENIE z rodziną Lista Audyt"
}

def sql_escape(s):
    if s is None: return 'NULL'
    return "'" + s.replace("'", "''") + "'"

def parse_docx(filepath):
    """Parsuje docx i zwraca listę pozycji [(section, label, parent, helper, sort_order, is_required)]."""
    d = Document(filepath)
    items = []
    current_section = 'dokumenty_wymagane'   # default
    current_parent = None
    sort_order = 0
    in_dodatkowe = False  # po '+ DODATKOWE' wszystko is_required=False

    for p in d.paragraphs:
        text = p.text.strip()
        if not text:
            continue

        # Sekcje
        upper = text.upper()
        if 'BRAKI FORMALNE' in upper:
            current_section = 'braki_formalne'
            current_parent = None
            in_dodatkowe = False
            continue
        if 'BRAKI MERYTORYCZNE' in upper:
            current_section = 'braki_merytoryczne'
            current_parent = None
            in_dodatkowe = False
            continue
        if 'DODATKOWE' in upper and len(text) < 30:
            in_dodatkowe = True
            continue
        if 'LISTA' in upper and ('AUDYT' in upper or 'WYMAGANYCH' in upper):
            continue  # nagłówek tytułowy

        # Detekcja zagnieżdżeń przez wcięcia tabularne (\t)
        leading_tabs = len(text) - len(text.lstrip('\t'))
        clean = text.lstrip('\t').strip()

        # Usuń znaczniki □, *, +, -
        if clean.startswith('□'):
            clean = clean.lstrip('□').strip()
        elif clean.startswith('+'):
            clean = clean.lstrip('+').strip()
        elif clean.startswith('-'):
            # myślnik czasem to bullet, czasem opis
            clean = clean.lstrip('-').strip()
        elif clean.startswith('*'):
            clean = clean.lstrip('*').strip()

        if not clean:
            continue

        # Krótka heurystyka: jeśli linia kończy się ":" — to grupa (parent)
        if clean.endswith(':') and leading_tabs == 0:
            current_parent = clean.rstrip(':').strip()
            sort_order += 10
            items.append({
                'section': current_section,
                'label': clean.rstrip(':').strip(),
                'parent_label': None,
                'helper_text': None,
                'sort_order': sort_order,
                'is_required': not in_dodatkowe,
            })
            continue

        # Sub-item (zagnieżdżenie)
        if leading_tabs > 0 and current_parent:
            # Linia pod parentem
            sort_order += 1
            items.append({
                'section': current_section,
                'label': clean,
                'parent_label': current_parent,
                'helper_text': None,
                'sort_order': sort_order,
                'is_required': not in_dodatkowe,
            })
            continue

        # Top-level item
        current_parent = None
        sort_order += 10
        items.append({
            'section': current_section,
            'label': clean,
            'parent_label': None,
            'helper_text': None,
            'sort_order': sort_order,
            'is_required': not in_dodatkowe,
        })

    return items


def generate_sql(category_code, items, source_file):
    if not items:
        return f"-- Brak pozycji dla {category_code} ({source_file})\n"

    sql_lines = [
        f"-- ============================================================================",
        f"-- Seed checklist dla kategorii: {category_code}",
        f"-- Źródło: dane_od_pawla/rozwinęcie v3/{source_file}",
        f"-- Wygenerowano automatycznie przez scripts/generate_checklist_seeds.py",
        f"-- ============================================================================",
        f"",
        f"-- Idempotentność: usuń istniejące wzorce dla tej kategorii (jeśli były)",
        f"DELETE FROM gmp_checklist_definitions WHERE category_code = '{category_code}';",
        f"",
        f"INSERT INTO gmp_checklist_definitions (category_code, section, label, parent_label, sort_order, is_required)",
        f"VALUES",
    ]

    rows = []
    for it in items:
        if not it['label'] or len(it['label']) > 250:
            continue
        rows.append(
            f"    ('{category_code}', '{it['section']}', "
            f"{sql_escape(it['label'])}, {sql_escape(it['parent_label'])}, "
            f"{it['sort_order']}, {str(it['is_required']).upper()})"
        )

    sql_lines.append(',\n'.join(rows) + ';')
    sql_lines.append('')
    return '\n'.join(sql_lines)


def main():
    all_seeds = []
    for fname, cat in MAPPING.items():
        path = os.path.join(PAWEL_DIR, fname)
        if not os.path.exists(path):
            print(f'⚠ {fname} nie istnieje, skip')
            continue

        with open(os.path.join(PAWEL_DIR, 'mapping.json'), encoding='utf-8') as f:
            mapping_real = json.load(f)
        real_name = mapping_real.get(fname, fname)

        items = parse_docx(path)
        print(f'{cat:30s} ← {fname:12s} | {real_name[:50]:50s} | {len(items):3d} pozycji')

        sql = generate_sql(cat, items, real_name)
        all_seeds.append(sql)

    full_seed = '\n'.join(all_seeds)
    out_path = os.path.join(OUT_DIR, '20260513_01_checklist_seeds_all.sql')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(f"-- ============================================================================\n")
        f.write(f"-- Etap II-B — Seed wszystkich list audytowych Pawła (11 kategorii)\n")
        f.write(f"-- ============================================================================\n\n")
        f.write(full_seed)

    print(f'\n✓ Zapisano: {out_path}')
    print(f'  Rozmiar: {os.path.getsize(out_path)} bajtów')


if __name__ == '__main__':
    main()

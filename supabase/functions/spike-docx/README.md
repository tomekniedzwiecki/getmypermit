# SPIKE: docx-templates na Deno

**Cel:** zweryfikować przed Etapem II-A czy `docx-templates` faktycznie chodzi w Supabase Edge Functions runtime (Deno).

## Krok 1: Utworzenie test template DOCX

Wymaga LibreOffice / Microsoft Word lub Python `python-docx`:

```python
# scripts/create_spike_template.py
from docx import Document
from docx.shared import Cm

d = Document()
d.add_heading('Test docx-templates spike', 0)
d.add_paragraph('Klient: {full_client_name}')
d.add_paragraph('Numer sprawy: {case_number}')
d.add_paragraph('Data: {today}')

d.add_heading('Harmonogram rat', 1)

table = d.add_table(rows=1, cols=4)
hdr = table.rows[0].cells
hdr[0].text = 'Lp.'
hdr[1].text = 'Kwota (zł)'
hdr[2].text = 'Termin'
hdr[3].text = 'Status'

# Pętla docx-templates: cały wiersz z {FOR i IN installments}
row = table.add_row().cells
row[0].text = '{FOR i IN installments}{$i.number}'
row[1].text = '{$i.amount}'
row[2].text = '{$i.due_date}'
row[3].text = '{$i.status}{END-FOR}'

d.save('_spike_test_template.docx')
```

Następnie upload do Supabase Storage bucket `document-templates`:
```bash
# Manual przez Dashboard → Storage → document-templates → Upload _spike_test_template.docx
# LUB:
curl -X POST "https://gfwsdrbywgmceateubyq.supabase.co/storage/v1/object/document-templates/_spike_test_template.docx" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document" \
  --data-binary @_spike_test_template.docx
```

(Jeśli bucket `document-templates` jeszcze nie istnieje — najpierw utworzyć przez Etap II-A migrację 20260507_05.)

## Krok 2: Deploy spike

```bash
cd /c/repos_tn/getmypermit
npx supabase functions deploy _spike-docx --project-ref gfwsdrbywgmceateubyq
```

## Krok 3: Test

```bash
# 1. Pobierz ANON_KEY z Supabase Dashboard
# 2. Wykonaj test:
curl -X POST "https://gfwsdrbywgmceateubyq.supabase.co/functions/v1/_spike-docx" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"client_first_name":"Test","client_last_name":"User"}' \
  -o spike_output.docx \
  -D headers.txt

# Sprawdź headers:
cat headers.txt | grep -E "X-Render-Ms|X-Total-Ms"
# Otwórz DOCX w MS Word / LibreOffice i sprawdź czy:
# - placeholdery wypełnione
# - tabela rat ma 10 wierszy
# - polskie znaki (jeśli dodasz)
```

## Krok 4: Kryteria sukcesu

- [ ] Function deploy bez błędów (pakiet `docx-templates` ładuje się z esm.sh)
- [ ] HTTP 200 z DOCX w body
- [ ] `X-Render-Ms` < 500
- [ ] DOCX otwiera się w MS Word i LibreOffice bez warningów
- [ ] Wszystkie placeholdery wypełnione
- [ ] Pętla `{FOR}{END-FOR}` wygenerowała 10 wierszy

## Krok 5: Cleanup

Po pomyślnym teście:
```bash
npx supabase functions delete _spike-docx --project-ref gfwsdrbywgmceateubyq
```

## Plan B (jeśli fail)

Jeśli `docx-templates` nie ładuje się na Deno lub render padnie:
1. Spróbuj alternatywy: `easy-template-x` (mniej Deno-friendly)
2. Plan B: Cloudflare Workers Node compat mode (przeniesienie 1 funkcji)
3. Plan C: serwer DOCX w VPS (worst case)

Ten spike kosztuje 1-2 godziny — wczas wiemy.

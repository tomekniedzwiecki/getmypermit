-- Szablony notatek i emaili do szybkiego wstawiania
CREATE TABLE IF NOT EXISTS gmp_note_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('note', 'email', 'sms', 'whatsapp', 'call')),
    subject_template TEXT,
    body_template TEXT NOT NULL,
    description TEXT,
    sort_order INT DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES gmp_staff(id)
);

CREATE INDEX IF NOT EXISTS idx_note_templates_category ON gmp_note_templates(category, sort_order);

ALTER TABLE gmp_note_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "note_templates_auth" ON gmp_note_templates;
CREATE POLICY "note_templates_auth" ON gmp_note_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed: najczęstsze notatki dla kancelarii imigracyjnej
INSERT INTO gmp_note_templates (name, category, body_template, description, sort_order) VALUES
    -- Notatki z rozmów
    ('Zadzwoniłem — brak odpowiedzi', 'note',
     'Próba kontaktu telefonicznego z klientem {klient} - brak odpowiedzi. Zostawiam wiadomość o oddzwonienie.',
     'Szybka notatka po nieudanej próbie kontaktu', 10),

    ('Zadzwoniłem — rozmowa ustaliła', 'note',
     'Rozmawiałem z klientem {klient}. Ustalenia:\n- \n- \n- \nNastępny kontakt: ',
     'Po udanej rozmowie telefonicznej', 20),

    ('Wysłano prośbę o dokumenty', 'note',
     'Wysłano do klienta {klient} prośbę o uzupełnienie dokumentów:\n- kopia paszportu\n- umowa o pracę\n- zdjęcia biometryczne\n- potwierdzenie zameldowania',
     'Standardowa prośba o dokumenty', 30),

    ('Dokumenty dostarczone', 'note',
     'Klient {klient} dostarczył komplet wymaganych dokumentów. Sprawa gotowa do przygotowania wniosku.',
     'Potwierdzenie otrzymania dokumentów', 40),

    ('Wniosek złożony', 'note',
     'Wniosek klienta {klient} został złożony w {urzad}. Nr sprawy: {nr_sprawy}.',
     'Po złożeniu wniosku', 50),

    ('Otrzymano wezwanie z urzędu', 'note',
     'Urząd {urzad} wystosował wezwanie w sprawie {nr_sprawy}. Termin odpowiedzi: .\nCzego dotyczy:\n- ',
     'Po otrzymaniu wezwania', 60),

    ('Wyznaczono termin odcisków', 'note',
     'Klient {klient} otrzymał termin na złożenie odcisków palców: . Poinformowany przez telefon/email.',
     'Po wyznaczeniu terminu PIO', 70),

    -- Email templates
    ('Email: przyjęcie sprawy', 'email',
     'Dzień dobry,\n\npotwierdzam przyjęcie sprawy dotyczącej {typ_sprawy} dla {klient}.\n\nW najbliższych dniach skontaktujemy się z Państwem w celu ustalenia szczegółów oraz przekazania listy niezbędnych dokumentów.\n\nPozdrawiamy,\nKancelaria GetMyPermit',
     'Potwierdzenie przyjęcia sprawy', 100),

    ('Email: prośba o dokumenty', 'email',
     'Dzień dobry,\n\nw celu przygotowania wniosku uprzejmie prosimy o przekazanie następujących dokumentów:\n\n1. Kopia paszportu (wszystkie strony z wpisami)\n2. Umowa o pracę + ostatnie 3 paski wypłat\n3. Zdjęcia biometryczne (4 szt.)\n4. Potwierdzenie zameldowania\n5. Dokumenty ubezpieczenia zdrowotnego\n\nDokumenty prosimy przesłać na adres: dokumenty@getmypermit.pl lub dostarczyć osobiście do kancelarii.\n\nPozdrawiamy,\nKancelaria GetMyPermit',
     'Prośba o standardowe dokumenty', 110),

    ('Email: przypomnienie o dokumentach', 'email',
     'Dzień dobry,\n\nuprzejmie przypominamy o konieczności uzupełnienia brakujących dokumentów w sprawie {nr_sprawy}. Bez kompletu dokumentów nie możemy kontynuować procedury.\n\nProszę o kontakt w przypadku pytań lub trudności.\n\nPozdrawiamy,\nKancelaria GetMyPermit',
     'Delikatne przypomnienie', 120),

    ('Email: info o odciskach', 'email',
     'Dzień dobry,\n\ninformujemy, że w sprawie {nr_sprawy} wyznaczono termin osobistego stawiennictwa w celu złożenia odcisków palców:\n\nData:  \nGodzina:  \nMiejsce:  \nNr biletu:  \n\nProsimy zabrać ze sobą paszport oraz oryginał wezwania.\n\nPozdrawiamy,\nKancelaria GetMyPermit',
     'Informacja o terminie PIO', 130),

    ('Email: decyzja pozytywna', 'email',
     'Dzień dobry,\n\nmamy przyjemność poinformować, że w sprawie {nr_sprawy} wydano decyzję pozytywną. Karta pobytu zostanie przygotowana do odbioru w najbliższym czasie.\n\nPozdrawiamy,\nKancelaria GetMyPermit',
     'Po decyzji pozytywnej', 140),

    -- SMS / WhatsApp (krótkie)
    ('SMS: przypomnienie o spotkaniu', 'sms',
     'GetMyPermit: Przypominamy o spotkaniu jutro o {godzina}. Adres: .  Pozdrawiamy.',
     'SMS-owe przypomnienie 24h przed', 200),

    ('WA: prośba o dokumenty', 'whatsapp',
     'Dzień dobry {klient}! Prosimy o przesłanie zdjęcia paszportu i aktualnej umowy o pracę. Dziękujemy!',
     'Szybka wiadomość WhatsApp', 210)
ON CONFLICT DO NOTHING;

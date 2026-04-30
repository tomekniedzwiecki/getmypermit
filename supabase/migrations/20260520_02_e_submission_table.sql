-- ============================================================================
-- Etap III — § III.1 — Tabele gmp_e_submission_status + attachments
-- ============================================================================

CREATE TABLE IF NOT EXISTS gmp_e_submission_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL UNIQUE REFERENCES gmp_cases ON DELETE CASCADE,

    -- A. Minimum dokumentów (pkt 10.A) — agregat (per pozycja w checklist)
    minimum_status gmp_e_submission_step_status DEFAULT 'pending',
    minimum_missing TEXT[],                        -- np. ['zdjecia', 'ankieta']

    -- B. Profil zaufany (pkt 10.B) — meta-flagi nad gmp_trusted_profile_credentials
    pz_status TEXT CHECK (pz_status IN ('istnieje', 'brak', 'do_weryfikacji')),
    pz_login_confirmed BOOLEAN DEFAULT FALSE,
    pz_method_verified BOOLEAN DEFAULT FALSE,
    pz_client_aware BOOLEAN DEFAULT FALSE,
    pz_notes TEXT,

    -- C. Ankieta (pkt 10.C) — meta-flagi nad gmp_intake_tokens
    ankieta_mode TEXT CHECK (ankieta_mode IN ('klient_link', 'pracownik_recznie', 'mieszane')),
    ankieta_status gmp_e_submission_step_status DEFAULT 'pending',

    -- D. Opłaty admin (pkt 10.D) — ROZDZIELONE na wniosek i kartę z 7 flagami każda (review B2)
    oplata_wniosku_required BOOLEAN DEFAULT TRUE,
    oplata_wniosku_status gmp_oplata_status DEFAULT 'do_oplaty',
    oplata_wniosku_amount NUMERIC(10,2),           -- override default jeśli "inna kwota"
    oplata_wniosku_blokuje BOOLEAN DEFAULT FALSE,
    oplata_wniosku_notes TEXT,

    oplata_karty_required BOOLEAN DEFAULT TRUE,
    oplata_karty_status gmp_oplata_status DEFAULT 'do_oplaty',
    oplata_karty_amount NUMERIC(10,2),
    oplata_karty_blokuje BOOLEAN DEFAULT FALSE,
    oplata_karty_notes TEXT,

    -- E. Spotkanie (pkt 10.E)
    spotkanie_appointment_id UUID REFERENCES gmp_crm_appointments ON DELETE SET NULL,
    spotkanie_task_id UUID REFERENCES gmp_tasks ON DELETE SET NULL,
    spotkanie_mode TEXT CHECK (spotkanie_mode IN ('appointment', 'task_only')),
    spotkanie_status TEXT CHECK (spotkanie_status IN ('do_umowienia', 'umowione', 'odbylo_sie', 'przelozone')),

    -- F. Załącznik nr 1 (pkt 10.F) + checklista koordynacyjna 6 boxów (review B4)
    zalacznik_nr_1_model gmp_zalacznik_nr_1_model DEFAULT 'nie_dotyczy',
    zalacznik_nr_1_signed BOOLEAN DEFAULT FALSE,
    zalacznik_nr_1_notes TEXT,
    zalacznik_nr_1_coordination_checklist JSONB DEFAULT '{}'::jsonb,
    -- Klucze: { signer_identified, representation_verified, employer_time_set,
    --          instruction_sent, attachment_signed, has_problem }

    -- G. Złożenie + UPO (pkt 10.G) + checklista operacyjna 11 boxów (review B5)
    submitted_at TIMESTAMPTZ,
    submission_method_used TEXT,                   -- final method: elektronicznie/osobiscie/...
    upo_number TEXT,
    upo_generated BOOLEAN DEFAULT FALSE,
    upo_document_id UUID REFERENCES gmp_documents ON DELETE SET NULL,
    submit_meeting_checklist JSONB DEFAULT '{}'::jsonb,
    -- 11 kluczy: client_present, pz_works, application_filled, intake_verified,
    --            fee_paid, card_fee_marked, attachment_signed, client_signed,
    --            application_sent, upo_generated, upo_saved

    -- H. Raporty (pkt 10.H)
    report_klient_generated_at TIMESTAMPTZ,
    report_klient_document_id UUID REFERENCES gmp_documents ON DELETE SET NULL,
    report_pracodawca_generated_at TIMESTAMPTZ,
    report_pracodawca_document_id UUID REFERENCES gmp_documents ON DELETE SET NULL,

    notify_klient_after_submit BOOLEAN DEFAULT TRUE,
    notify_pracodawca_after_submit BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_e_subm_case ON gmp_e_submission_status(case_id);
CREATE INDEX IF NOT EXISTS idx_e_subm_blockers ON gmp_e_submission_status(case_id)
    WHERE oplata_wniosku_blokuje OR oplata_karty_blokuje OR zalacznik_nr_1_model = 'do_ustalenia';

-- Załączniki: UPO + inne pliki potwierdzające złożenie
CREATE TABLE IF NOT EXISTS gmp_e_submission_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    e_submission_id UUID NOT NULL REFERENCES gmp_e_submission_status ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES gmp_cases ON DELETE CASCADE,
    kind TEXT NOT NULL,                             -- 'upo' | 'potwierdzenie_zlozenia' | 'epuap_response' | 'inne'
    storage_path TEXT NOT NULL,
    file_name TEXT,
    file_size INT,
    mime_type TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES gmp_staff
);

CREATE INDEX IF NOT EXISTS idx_e_subm_attach_case ON gmp_e_submission_attachments(case_id);
CREATE INDEX IF NOT EXISTS idx_e_subm_attach_kind ON gmp_e_submission_attachments(case_id, kind);

-- RLS
ALTER TABLE gmp_e_submission_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_e_subm" ON gmp_e_submission_status;
CREATE POLICY "staff_e_subm" ON gmp_e_submission_status FOR ALL USING (auth.uid() IS NOT NULL);

ALTER TABLE gmp_e_submission_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_e_subm_att" ON gmp_e_submission_attachments;
CREATE POLICY "staff_e_subm_att" ON gmp_e_submission_attachments FOR ALL USING (auth.uid() IS NOT NULL);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION gmp_e_subm_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_e_subm_updated_at ON gmp_e_submission_status;
CREATE TRIGGER trg_e_subm_updated_at BEFORE UPDATE ON gmp_e_submission_status
    FOR EACH ROW EXECUTE FUNCTION gmp_e_subm_updated_at();

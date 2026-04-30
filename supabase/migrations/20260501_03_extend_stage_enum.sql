-- ============================================================================
-- Etap I — § 1.2 — Rozszerzenie gmp_case_stage o gotowa_do_zlozenia (B6)
-- ============================================================================
-- Paweł pkt 11: nasze enum nie ma "gotowa_do_zlozenia". Dodaję.
-- Split obowiązkowy (jak w 20260501_01).
-- ============================================================================

ALTER TYPE gmp_case_stage ADD VALUE IF NOT EXISTS 'gotowa_do_zlozenia';

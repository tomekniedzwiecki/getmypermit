-- ============================================================================
-- Etap II-C — § II-C.2 — Default opłaty admin per pawel_group (Pawel pkt 10.D)
-- ============================================================================
-- Wartości:
--   pobyt_praca:       440 zł (wniosek) + 100 zł (karta)
--   pobyt_rodzina:     340 zł + 100 zł
--   pobyt_staly:       640 zł + 100 zł
--   rezydent_ue:       640 zł + 100 zł
--   zezwolenie_praca:  100 zł (różne kwoty per typ — placeholder)
-- Karta pobytu: 50 zł dla dzieci <16 lat, inaczej 100 zł
-- ============================================================================

CREATE OR REPLACE FUNCTION gmp_default_admin_fee(p_pawel_group TEXT)
RETURNS NUMERIC AS $$
BEGIN
    RETURN CASE p_pawel_group
        WHEN 'pobyt_praca'      THEN 440
        WHEN 'pobyt_rodzina'    THEN 340
        WHEN 'pobyt_staly'      THEN 640
        WHEN 'rezydent_ue'      THEN 640
        WHEN 'zezwolenie_praca' THEN 100
        ELSE 340
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION gmp_default_admin_fee IS
'Domyślna opłata administracyjna per pawel_group (Pawel pkt 10.D). Wykorzystanie: Wizard Step 4 — preselected wartość admin_fee_amount.';

CREATE OR REPLACE FUNCTION gmp_default_card_fee(p_client_id UUID)
RETURNS NUMERIC AS $$
DECLARE v_age INT;
BEGIN
    SELECT EXTRACT(YEAR FROM AGE(birth_date))::INT INTO v_age
    FROM gmp_clients WHERE id = p_client_id;
    RETURN CASE WHEN v_age IS NOT NULL AND v_age < 16 THEN 50 ELSE 100 END;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION gmp_default_card_fee IS
'Opłata za kartę pobytu: 50 zł dla dzieci <16, 100 zł dla pozostałych. NULL birth_date = 100 zł (default).';

GRANT EXECUTE ON FUNCTION gmp_default_admin_fee TO authenticated;
GRANT EXECUTE ON FUNCTION gmp_default_card_fee TO authenticated;

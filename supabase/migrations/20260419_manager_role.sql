-- E (req Pawel pkt 5): dodajemy role 'manager' dla rol nadzorczych (Wiktoria, Oleksandr)
-- Manager = prawnik + dostep do analityki wydajnosci zespolu + globalne finanse (bez usuwania).

ALTER TABLE gmp_staff DROP CONSTRAINT IF EXISTS gmp_staff_role_check;
ALTER TABLE gmp_staff ADD CONSTRAINT gmp_staff_role_check
    CHECK (role IN ('owner', 'admin', 'manager', 'lawyer', 'assistant', 'staff'));

COMMENT ON COLUMN gmp_staff.role IS
    'owner - zalozyciele (pelen dostep), admin - admin kancelarii (pelen dostep), manager - rola nadzorcza (analityka zespolu), lawyer - standardowy prawnik, assistant - asystent (bez globalnych finansow), staff - legacy';

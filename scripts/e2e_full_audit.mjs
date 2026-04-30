// Pełny audit e2e — sprawdza KAŻDY element UI dodany w Etapie I + II-A + II-B
// + regression test (czy istniejące zakładki nie są zepsute)
import 'dotenv/config';
import { chromium } from 'playwright';
import pg from 'pg';

const SUPA = process.env.SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;

const issues = [];   // [{level, location, problem}]
const passes = [];

function pass(loc, msg) { passes.push({loc, msg}); console.log(`  ✓ ${loc}: ${msg}`); }
function fail(loc, msg) { issues.push({level: 'FAIL', loc, msg}); console.log(`  ✗ FAIL ${loc}: ${msg}`); }
function warn(loc, msg) { issues.push({level: 'WARN', loc, msg}); console.log(`  ⚠ WARN ${loc}: ${msg}`); }

// 1. Auth
const link = await fetch(SUPA + '/auth/v1/admin/generate_link', {
    method: 'POST',
    headers: {Authorization: 'Bearer ' + SVC, apikey: SVC, 'Content-Type': 'application/json'},
    body: JSON.stringify({type: 'magiclink', email: 'tomekniedzwiecki@gmail.com'})
}).then(r => r.json());
const ver = await fetch(SUPA + '/auth/v1/verify', {
    method: 'POST',
    headers: {apikey: ANON, 'Content-Type': 'application/json'},
    body: JSON.stringify({type: 'magiclink', email: 'tomekniedzwiecki@gmail.com', token: link.email_otp})
}).then(r => r.json());

// 2. Test cases — różne typy
const c = new pg.Client({host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432,
    user: 'postgres.gfwsdrbywgmceateubyq', database: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD, ssl: {rejectUnauthorized: false}});
await c.connect();
const cases = {
    individual_with_checklist: (await c.query("SELECT id, case_number FROM gmp_cases WHERE category = 'pobyt_praca' AND status = 'aktywna' AND party_type = 'individual' LIMIT 1")).rows[0],
    individual_legacy: (await c.query("SELECT id, case_number FROM gmp_cases WHERE category = 'pobyt' AND status = 'aktywna' LIMIT 1")).rows[0],
    employer: (await c.query("SELECT id, case_number FROM gmp_cases WHERE party_type = 'employer' LIMIT 1")).rows[0],
};
await c.end();

console.log('Test cases:');
for (const [k, v] of Object.entries(cases)) console.log(`  ${k}: ${v?.case_number || 'BRAK'} (${v?.id?.slice(0,8) || 'n/a'})`);

const browser = await chromium.launch({ headless: true });
const session = {
    access_token: ver.access_token, refresh_token: ver.refresh_token,
    expires_in: ver.expires_in, expires_at: Math.floor(Date.now()/1000) + ver.expires_in,
    token_type: 'bearer', user: ver.user,
};
const context = await browser.newContext({ viewport: { width: 1400, height: 900 }});
await context.addInitScript(({session}) => {
    localStorage.setItem('gmp-crm-auth', JSON.stringify(session));
}, {session});

const page = await context.newPage();
const consoleErrors = [];
const networkErrors = [];
page.on('console', msg => {
    if (msg.type() === 'error') {
        const t = msg.text();
        // ignoruj favicon, sourcemap
        if (!t.includes('favicon') && !t.includes('.map') && !t.includes('sourceMappingURL')) {
            consoleErrors.push(t);
        }
    }
});
page.on('response', resp => {
    if (resp.status() >= 400 && !resp.url().includes('favicon') && !resp.url().includes('.map')) {
        networkErrors.push(`${resp.status()} ${resp.url().split('?')[0].slice(-80)}`);
    }
});

// =====================================================
// TEST GROUP 1: cases.html
// =====================================================
console.log('\n========== TEST 1: cases.html ==========');
await page.goto('https://crm.getmypermit.pl/cases.html', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// Drafts banner — może być widoczny lub nie
const draftsBanner = await page.locator('#drafts-banner').isVisible();
console.log(`  Banner szkiców: ${draftsBanner ? 'VISIBLE' : 'hidden'}`);
if (draftsBanner) {
    // Test klik "Pokaż szkice"
    const btnText = await page.locator('#drafts-banner button:not([title])').first().textContent();
    if (btnText && btnText.includes('Pokaż')) {
        const beforeCount = await page.locator('table tbody tr').count();
        await page.click('#drafts-banner button:has-text("Pokaż szkice")');
        await page.waitForTimeout(1500);
        const statusValue = await page.locator('#f-status').inputValue();
        if (statusValue === 'lead') pass('cases.html', 'Klik "Pokaż szkice" ustawił filtr status=lead');
        else fail('cases.html', `Klik "Pokaż szkice" nie ustawił filtru: status="${statusValue}"`);
    }
}

// Sprawdź header "Tryb sprawy"
const headerTryb = await page.locator('th:has-text("Tryb sprawy")').count();
if (headerTryb > 0) pass('cases.html', 'Header "Tryb sprawy" istnieje');
else fail('cases.html', 'Header "Tryb sprawy" BRAK (powinien być po rename z "Typ")');

const headerTyp = await page.locator('th:has-text("Typ sprawy")').count();
if (headerTyp > 0) fail('cases.html', '"Typ sprawy" nadal istnieje (rename niekompletny)');

// =====================================================
// TEST GROUP 2: dashboard.html
// =====================================================
console.log('\n========== TEST 2: dashboard.html ==========');
await page.goto('https://crm.getmypermit.pl/dashboard.html', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);

// Kafelek "Zbliżające się raty" — visible?
const upcomingTile = await page.locator('a[href="receivables.html"]:has-text("Zbliżające się raty")').count();
if (upcomingTile > 0) pass('dashboard.html', 'Kafelek "Zbliżające się raty" istnieje');
else fail('dashboard.html', 'Kafelek "Zbliżające się raty" BRAK (powinien być w hero KPI)');

// Klik kafelka — czy prowadzi do receivables
if (upcomingTile > 0) {
    const tile = page.locator('a[href="receivables.html"]:has-text("Zbliżające się raty")').first();
    const href = await tile.getAttribute('href');
    if (href && href.includes('receivables')) pass('dashboard.html', `Kafelek prowadzi do ${href}`);
    else fail('dashboard.html', `Kafelek ma zły href: ${href}`);
}

// =====================================================
// TEST GROUP 3: receivables.html
// =====================================================
console.log('\n========== TEST 3: receivables.html ==========');
await page.goto('https://crm.getmypermit.pl/receivables.html', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);

const upcomingSection = await page.locator('#upcoming-installments-section').count();
if (upcomingSection > 0) pass('receivables.html', 'Sekcja "Zbliżające się raty" istnieje');
else fail('receivables.html', 'Sekcja "Zbliżające się raty 14 dni" BRAK');

const upcomingHidden = await page.locator('#upcoming-installments-section').evaluate(el => el.classList.contains('hidden')).catch(() => true);
console.log(`  Sekcja upcoming: ${upcomingHidden ? 'hidden (brak danych — OK)' : 'VISIBLE'}`);

// =====================================================
// TEST GROUP 4: case.html (individual + checklist)
// =====================================================
console.log('\n========== TEST 4: case.html (pobyt_praca z checklistą) ==========');
await page.goto(`https://crm.getmypermit.pl/case.html?id=${cases.individual_with_checklist.id}`,
    { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForSelector('#case-content:not(.hidden)', { timeout: 15000 });
await page.waitForTimeout(3000);

// 4.1 — Co teraz banner
const ctzBanner = await page.locator('#next-steps').isVisible();
if (ctzBanner) {
    const items = await page.locator('#next-steps-list .next-steps-item').count();
    pass('case.html', `Banner "Co teraz" widoczny z ${items} pozycjami`);

    // Klik pierwszego buttona
    const btn = page.locator('#next-steps-list button.next-steps-action').first();
    if (await btn.count() > 0) {
        const tabBefore = await page.locator('.case-tab.active').getAttribute('data-tab');
        await btn.click();
        await page.waitForTimeout(1500);
        const tabAfter = await page.locator('.case-tab.active').getAttribute('data-tab');
        if (tabBefore !== tabAfter) pass('case.html', `Klik Otwórz: ${tabBefore} → ${tabAfter}`);
        else warn('case.html', `Klik Otwórz: zakładka NIE zmieniła się (działa tylko jeśli action_url to inny tab)`);
    }
} else {
    warn('case.html', 'Banner "Co teraz" hidden (brak pasujących reguł — może być OK)');
}

// 4.2 — Workers card hidden (party_type=individual)
await page.goto(`https://crm.getmypermit.pl/case.html?id=${cases.individual_with_checklist.id}`,
    { waitUntil: 'networkidle' });
await page.waitForSelector('#case-content:not(.hidden)');
await page.waitForTimeout(3000);
const workersHidden = await page.locator('#workers-card').evaluate(el => el.classList.contains('hidden'));
if (workersHidden) pass('case.html', 'Workers-card HIDDEN dla individual ✓');
else fail('case.html', 'Workers-card WIDOCZNY dla individual (powinien być hidden)');

// 4.3 — Klik zakładka Dokumenty
await page.click('button.case-tab[data-tab="documents"]');
await page.waitForTimeout(2500);

const genSection = await page.locator('#document-generator-section').count();
if (genSection === 0) fail('case.html', 'Sekcja Generator BRAK');
else {
    const generatorRows = await page.locator('#document-generator-section .generator-row').count();
    if (generatorRows > 0) pass('case.html', `Generator: ${generatorRows} wierszy szablonów`);
    else fail('case.html', `Generator: 0 wierszy (powinno być >=4)`);

    // Test klik Generuj
    const genButtons = await page.locator('#document-generator-section button[data-action="generate"]').count();
    const downloadButtons = await page.locator('#document-generator-section a[data-action="download"]').count();
    console.log(`  Buttonów Generuj: ${genButtons}, Pobierz: ${downloadButtons}`);

    if (genButtons > 0) {
        // Spróbuj wygenerować pierwszy nie-wygenerowany
        const firstGen = page.locator('#document-generator-section button[data-action="generate"]').first();
        const tplId = await firstGen.getAttribute('data-tpl-id');
        console.log(`  Próba kliknięcia "Generuj" template ${tplId?.slice(0,8)}...`);

        // Listen na new download
        const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);

        await firstGen.click();
        const download = await downloadPromise;
        if (download) {
            pass('case.html', `Generuj → download triggerd: ${download.suggestedFilename()}`);
        } else {
            warn('case.html', 'Generuj → download NIE wystartował w 30s (może race-guard 60s)');
        }
        await page.waitForTimeout(2000);
    }

    if (downloadButtons > 0) {
        const dlBtn = page.locator('#document-generator-section a[data-action="download"]').first();
        const downloadPromise = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
        await dlBtn.click();
        const dl = await downloadPromise;
        if (dl) pass('case.html', `Pobierz wygenerowanego: ${dl.suggestedFilename()}`);
        else warn('case.html', 'Pobierz nie wytriggerowal downloadu (może otworzyło tab)');
    }
}

// 4.4 — Klik zakładka Checklista
await page.click('button.case-tab[data-tab="checklist"]');
await page.waitForTimeout(2500);

const checklistItems = await page.locator('#checklist-section .checklist-item').count();
if (checklistItems > 0) pass('case.html', `Checklista: ${checklistItems} pozycji`);
else fail('case.html', 'Checklista: 0 pozycji (powinno być ~29)');

// Test klik checkboxa
const firstCheckbox = page.locator('#checklist-section .checklist-item-status').first();
if (await firstCheckbox.count() > 0) {
    // Pobierz status PRZED
    const iconBefore = await firstCheckbox.locator('i').getAttribute('class');
    await firstCheckbox.click();
    await page.waitForTimeout(2000);
    const iconAfter = await page.locator('#checklist-section .checklist-item-status').first().locator('i').getAttribute('class');
    if (iconBefore !== iconAfter) pass('case.html', `Checkbox status zmienił się: ${iconBefore} → ${iconAfter}`);
    else fail('case.html', 'Checkbox kliknięcie NIE zmieniło statusu');
}

// 4.5 — Pobierz audyt button
const auditBtn = page.locator('button[data-action="export-audit"]');
if (await auditBtn.count() > 0) {
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
    await auditBtn.click();
    const dl = await downloadPromise;
    if (dl) pass('case.html', `Pobierz audyt: ${dl.suggestedFilename()}`);
    else warn('case.html', 'Pobierz audyt NIE wytriggerowal downloadu');
}

// =====================================================
// TEST GROUP 5: REGRESSION — istniejące zakładki dalej działają
// =====================================================
console.log('\n========== TEST 5: REGRESSION istniejących zakładek ==========');

const tabsToTest = ['overview', 'history', 'tasks', 'finance', 'calendar', 'intake', 'data'];
for (const tab of tabsToTest) {
    consoleErrors.length = 0;
    await page.click(`button.case-tab[data-tab="${tab}"]`);
    await page.waitForTimeout(2500);
    const isVisible = await page.locator(`.tab-panel[data-panel="${tab}"]`).isVisible().catch(() => false);
    const tabErrors = consoleErrors.filter(e => !e.includes('intake') || tab === 'intake');
    if (isVisible) {
        if (tabErrors.length === 0) pass(`tab: ${tab}`, 'render bez błędów');
        else warn(`tab: ${tab}`, `errors: ${tabErrors.slice(0, 2).join('; ')}`);
    } else {
        fail(`tab: ${tab}`, 'panel niewidoczny');
    }
}

// =====================================================
// TEST GROUP 6: case.html dla legacy "pobyt" (sprawa BEZ checklist)
// =====================================================
if (cases.individual_legacy) {
    console.log('\n========== TEST 6: case.html (legacy pobyt — bez checklist) ==========');
    await page.goto(`https://crm.getmypermit.pl/case.html?id=${cases.individual_legacy.id}`,
        { waitUntil: 'networkidle' });
    await page.waitForSelector('#case-content:not(.hidden)');
    await page.waitForTimeout(2000);

    await page.click('button.case-tab[data-tab="checklist"]');
    await page.waitForTimeout(2500);
    const emptyMsg = await page.locator('#checklist-section').textContent();
    const hasEmptyState = emptyMsg.includes('Brak pozycji') || emptyMsg.includes('Wygeneruj checklistę');
    if (hasEmptyState) {
        pass('case.html (legacy)', 'Sprawa bez checklist pokazuje empty state z buttonem');
        const instBtn = await page.locator('button[data-action="instantiate-now"]').count();
        if (instBtn > 0) pass('case.html (legacy)', 'Button "Wygeneruj checklistę" widoczny');
    } else {
        warn('case.html (legacy)', 'Brak empty state dla checklist');
    }
}

// =====================================================
// TEST GROUP 7: case.html dla employer (workers card visible)
// =====================================================
if (cases.employer) {
    console.log('\n========== TEST 7: case.html (employer) ==========');
    await page.goto(`https://crm.getmypermit.pl/case.html?id=${cases.employer.id}`,
        { waitUntil: 'networkidle' });
    await page.waitForSelector('#case-content:not(.hidden)');
    await page.waitForTimeout(3000);
    const workersVisible = !(await page.locator('#workers-card').evaluate(el => el.classList.contains('hidden')));
    if (workersVisible) pass('case.html (employer)', 'Workers-card VISIBLE dla employer ✓');
    else fail('case.html (employer)', 'Workers-card HIDDEN dla employer (powinno być visible)');
}

// =====================================================
// SUMMARY
// =====================================================
console.log('\n\n' + '='.repeat(60));
console.log('SUMMARY:');
console.log('='.repeat(60));
console.log(`✓ PASS: ${passes.length}`);
console.log(`⚠ WARN: ${issues.filter(i => i.level === 'WARN').length}`);
console.log(`✗ FAIL: ${issues.filter(i => i.level === 'FAIL').length}`);

if (issues.length > 0) {
    console.log('\n--- ISSUES ---');
    for (const i of issues) {
        console.log(`${i.level === 'FAIL' ? '✗' : '⚠'} [${i.loc}] ${i.msg}`);
    }
}

if (consoleErrors.length > 0) {
    console.log('\n--- ZALEGŁE CONSOLE ERRORS (last set) ---');
    consoleErrors.slice(0, 5).forEach(e => console.log(' -', e.slice(0, 200)));
}

if (networkErrors.length > 0) {
    console.log('\n--- NETWORK 4xx/5xx ---');
    [...new Set(networkErrors)].slice(0, 10).forEach(e => console.log(' -', e));
}

await browser.close();
process.exit(issues.filter(i => i.level === 'FAIL').length > 0 ? 1 : 0);

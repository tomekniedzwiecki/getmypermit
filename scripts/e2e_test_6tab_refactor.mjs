// E2E test — refactor 10→6 zakładek + sub-tabs + mobile-first
import 'dotenv/config';
import { chromium } from 'playwright';
import pg from 'pg';

const SUPA = process.env.SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;

// --- Auth ---
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
if (!ver.access_token) { console.error('Auth failed', ver); process.exit(1); }

// --- Test cases: jedna z elektronicznym, jedna bez ---
const c = new pg.Client({host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432,
    user: 'postgres.gfwsdrbywgmceateubyq', database: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD, ssl: {rejectUnauthorized: false}});
await c.connect();
const r1 = await c.query("SELECT id, case_number, submission_method FROM gmp_cases WHERE submission_method = 'elektronicznie' ORDER BY created_at DESC LIMIT 1");
const r2 = await c.query("SELECT id, case_number, submission_method FROM gmp_cases WHERE submission_method = 'osobiscie' OR submission_method IS NULL ORDER BY created_at DESC LIMIT 1");
await c.end();

const ELEC = r1.rows[0];
const NORM = r2.rows[0];
console.log(`Test cases:`);
console.log(`  ELEK: ${ELEC?.case_number} (${ELEC?.id})`);
console.log(`  NORM: ${NORM?.case_number} (${NORM?.id})`);

const session = {
    access_token: ver.access_token, refresh_token: ver.refresh_token,
    expires_in: ver.expires_in, expires_at: Math.floor(Date.now()/1000) + ver.expires_in,
    token_type: 'bearer', user: ver.user,
};
const BASE = 'https://crm.getmypermit.pl';
const EXPECTED_TABS = ['overview', 'procedura', 'documents', 'finance', 'activity', 'data'];

async function runOne(viewport, label, caseId, caseNum) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport });
    await context.addInitScript(({ session }) => {
        localStorage.setItem('gmp-crm-auth', JSON.stringify(session));
    }, { session });
    const page = await context.newPage();
    const errs = [], net = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
    page.on('response', r => { if (r.status() >= 400 && !r.url().includes('favicon')) net.push(`${r.status()} ${r.url().split('?')[0].slice(-80)}`); });

    console.log(`\n=== [${label}] ${caseNum} (${viewport.width}×${viewport.height}) ===`);
    await page.goto(`${BASE}/case.html?id=${caseId}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('#case-content:not(.hidden)', { timeout: 15000 });

    // 1. Liczba zakładek = 6
    const tabs = await page.locator('button.case-tab').evaluateAll(els => els.map(e => e.dataset.tab));
    const tabCount = tabs.length;
    const tabsOk = JSON.stringify(tabs) === JSON.stringify(EXPECTED_TABS);
    console.log(`  Zakładki (${tabCount}): ${tabs.join(', ')} — ${tabsOk ? '✓' : '✗ ŹLE'}`);

    // 2. Mobile: labelki schowane
    if (viewport.width < 600) {
        // Aktywna ma label widoczny, nieaktywne — schowane
        const labels = await page.locator('button.case-tab').evaluateAll(btns => btns.map(b => ({
            tab: b.dataset.tab,
            active: b.classList.contains('active'),
            labelDisplay: window.getComputedStyle(b.querySelector('.case-tab-label')).display,
        })));
        const okActive = labels.find(l => l.active)?.labelDisplay !== 'none';
        const okInactive = labels.filter(l => !l.active).every(l => l.labelDisplay === 'none');
        console.log(`  Mobile: aktywna label widoczna (${okActive ? '✓' : '✗'}), nieaktywne label=none (${okInactive ? '✓' : '✗'})`);
    }

    // 3. Klik "Procedura"
    await page.click('button.case-tab[data-tab="procedura"]');
    await page.waitForTimeout(2500);
    const procVisible = await page.locator('.tab-panel[data-panel="procedura"]').isVisible();
    const checklistInProc = await page.locator('.tab-panel[data-panel="procedura"] #checklist-section').count();
    const eSubInProc = await page.locator('.tab-panel[data-panel="procedura"] #e-submission-section').count();
    console.log(`  Procedura visible: ${procVisible ? '✓' : '✗'}`);
    console.log(`  Checklist w procedura: ${checklistInProc > 0 ? '✓' : '✗'}, e-submission section: ${eSubInProc > 0 ? '✓' : '✗'}`);

    // 4. Conditional: e-submission widoczny tylko dla 'elektronicznie'
    const eSubShown = await page.locator('#e-submission-section').evaluate(el => {
        return el && !el.classList.contains('hidden') && el.offsetParent !== null;
    }).catch(() => false);
    const expected = ELEC && caseId === ELEC.id;
    const eSubOk = eSubShown === expected;
    console.log(`  E-submission ${expected ? 'WIDOCZNE' : 'UKRYTE'}: ${eSubOk ? '✓' : '✗ (rzeczywiste: ' + (eSubShown ? 'WIDOCZNE' : 'UKRYTE') + ')'}`);

    // 5. Klik "Dokumenty" + sub-taby
    await page.click('button.case-tab[data-tab="documents"]');
    await page.waitForTimeout(1500);
    const docSubTabs = await page.locator('.tab-panel[data-panel="documents"] .sub-tab').evaluateAll(els => els.map(e => e.dataset.subtab));
    console.log(`  Documents sub-taby: ${docSubTabs.join(', ')} (${docSubTabs.length === 3 ? '✓' : '✗ oczek. 3'})`);

    // klik intake
    await page.click('.tab-panel[data-panel="documents"] .sub-tab[data-subtab="intake"]');
    await page.waitForTimeout(1500);
    const intakeVisible = await page.locator('.tab-panel[data-panel="documents"] .sub-pane[data-subpane="intake"]').isVisible();
    console.log(`  Intake sub-tab: ${intakeVisible ? '✓' : '✗'}`);

    // 6. Klik "Aktywność" + sub-taby
    await page.click('button.case-tab[data-tab="activity"]');
    await page.waitForTimeout(1500);
    const actSubs = await page.locator('.tab-panel[data-panel="activity"] .sub-tab').evaluateAll(els => els.map(e => e.dataset.subtab));
    console.log(`  Activity sub-taby: ${actSubs.join(', ')} (${actSubs.length === 3 ? '✓' : '✗ oczek. 3'})`);

    await page.click('.tab-panel[data-panel="activity"] .sub-tab[data-subtab="history"]');
    await page.waitForTimeout(1500);
    const histVisible = await page.locator('.tab-panel[data-panel="activity"] .sub-pane[data-subpane="history"]').isVisible();
    console.log(`  History sub-tab: ${histVisible ? '✓' : '✗'}`);

    // 7. Klik "Co teraz" przycisk (jeśli istnieje)
    await page.click('button.case-tab[data-tab="overview"]');
    await page.waitForTimeout(800);
    const nextStepsBtns = await page.locator('#next-steps-list button.next-steps-action').count();
    console.log(`  Next-steps buttons: ${nextStepsBtns}`);
    if (nextStepsBtns > 0) {
        const firstUrl = await page.locator('#next-steps-list button.next-steps-action').first().getAttribute('data-action-url');
        await page.locator('#next-steps-list button.next-steps-action').first().click();
        await page.waitForTimeout(1500);
        const activeTab = await page.locator('button.case-tab.active').getAttribute('data-tab');
        console.log(`  Klik next-step (${firstUrl}) → tab=${activeTab}`);
    }

    // Screenshot
    const fname = `e2e_${label}_${viewport.width}x${viewport.height}.png`;
    await page.screenshot({ path: fname, fullPage: false });
    console.log(`  → ${fname}`);

    if (errs.length) {
        console.log(`  ⚠ Console errors (${errs.length}):`);
        errs.slice(0, 5).forEach(e => console.log(`     - ${e}`));
    }
    if (net.length) {
        console.log(`  ⚠ Net 4xx/5xx (${net.length}):`);
        net.slice(0, 5).forEach(e => console.log(`     - ${e}`));
    }

    await browser.close();
}

// Desktop + Mobile dla obu typów spraw
if (NORM) {
    await runOne({ width: 1400, height: 900 }, 'desktop_norm', NORM.id, NORM.case_number);
    await runOne({ width: 390, height: 844 }, 'mobile_norm', NORM.id, NORM.case_number);
}
if (ELEC) {
    await runOne({ width: 1400, height: 900 }, 'desktop_elec', ELEC.id, ELEC.case_number);
    await runOne({ width: 390, height: 844 }, 'mobile_elec', ELEC.id, ELEC.case_number);
}

console.log('\n=== E2E refactor test complete ===');

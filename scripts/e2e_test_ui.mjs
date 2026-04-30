// E2E test UI — Playwright headless Chromium
// Loguje przez magic link OTP, otwiera kartę sprawy, sprawdza render zakładek
import 'dotenv/config';
import { chromium } from 'playwright';
import fs from 'fs/promises';
import pg from 'pg';

const SUPA = process.env.SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;

// 1. Get user JWT
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

if (!ver.access_token) {
    console.error('Auth failed:', ver);
    process.exit(1);
}

// 2. Get test case
const c = new pg.Client({host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432,
    user: 'postgres.gfwsdrbywgmceateubyq', database: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD, ssl: {rejectUnauthorized: false}});
await c.connect();
const cs = await c.query("SELECT id, case_number FROM gmp_cases WHERE category = 'pobyt_praca' AND status = 'aktywna' LIMIT 1");
await c.end();
const caseId = cs.rows[0].id;
const caseNum = cs.rows[0].case_number;
console.log(`Test case: ${caseNum} (${caseId})`);

// 3. Launch browser
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
});

// Pre-set session in localStorage (kluczowe — supabase persistSession z key gmp-crm-auth)
const session = {
    access_token: ver.access_token,
    refresh_token: ver.refresh_token,
    expires_in: ver.expires_in,
    expires_at: Math.floor(Date.now()/1000) + ver.expires_in,
    token_type: 'bearer',
    user: ver.user,
};

await context.addInitScript(({ session }) => {
    localStorage.setItem('gmp-crm-auth', JSON.stringify(session));
}, { session });

const page = await context.newPage();

// Console + network logs
const consoleErrors = [];
const networkErrors = [];
page.on('console', msg => {
    if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
    }
});
page.on('response', resp => {
    if (resp.status() >= 400 && !resp.url().includes('favicon')) {
        networkErrors.push(`${resp.status()} ${resp.url().split('?')[0].slice(-80)}`);
    }
});

// Otwórz lokalny plik bezpośrednio przez https://crm.getmypermit.pl ?
// Najlepiej użyć produkcyjnego URL bo tam jest pełny static hosting.
const BASE_URL = 'https://crm.getmypermit.pl';

console.log(`\nOpening ${BASE_URL}/case.html?id=${caseId}`);
const t0 = Date.now();
await page.goto(`${BASE_URL}/case.html?id=${caseId}`, { waitUntil: 'networkidle', timeout: 30000 });
console.log(`Page loaded in ${Date.now()-t0}ms`);

// Czekaj na wyładowanie sprawy (case-content widoczne)
await page.waitForSelector('#case-content:not(.hidden)', { timeout: 15000 });
console.log('✓ Case loaded');

// === Test 1: case-client-name wypełnione ===
const clientName = await page.textContent('#case-client-name');
console.log(`✓ Client: ${clientName}`);

// === Test 2: Banner "Co teraz" ===
const nextStepsHidden = await page.locator('#next-steps').evaluate(el => el.classList.contains('hidden')).catch(() => true);
console.log(`Next-steps banner: ${nextStepsHidden ? 'HIDDEN (no steps)' : 'VISIBLE'}`);
if (!nextStepsHidden) {
    const items = await page.locator('#next-steps-list .next-steps-item').count();
    console.log(`  → ${items} kroków`);
}

// === Test 3: Conditional UI — workers card ===
const workersHidden = await page.locator('#workers-card').evaluate(el => el.classList.contains('hidden'));
const partyType = await page.evaluate(() => window.caseData?.party_type);
console.log(`Workers-card: ${workersHidden ? 'HIDDEN' : 'VISIBLE'} (party_type=${partyType}) — ${
    (workersHidden && partyType === 'individual') || (!workersHidden && partyType === 'employer') ? '✓ poprawnie' : '✗ ŹLE'
}`);

// === Test 4: Klik zakładka Dokumenty ===
console.log('\n--- Klikam Dokumenty ---');
await page.click('button.case-tab[data-tab="documents"]');
await page.waitForTimeout(2000);
const docGenSection = await page.locator('#document-generator-section').textContent();
const docGenLoaded = !docGenSection.includes('Ładuję');
console.log(`Generator dokumentów: ${docGenLoaded ? '✓ załadowany' : '✗ stuck na Ładuję'}`);

const generateRows = await page.locator('#document-generator-section .generator-row').count();
console.log(`  → ${generateRows} wierszy szablonów`);

// === Test 5: Klik zakładka Checklista ===
console.log('\n--- Klikam Checklista ---');
await page.click('button.case-tab[data-tab="checklist"]');
await page.waitForTimeout(2500);
const checklistContent = await page.locator('#checklist-section').textContent();
const checklistLoaded = !checklistContent.includes('Ładuję checklistę');
console.log(`Checklista: ${checklistLoaded ? '✓ załadowana' : '✗ stuck'}`);

const checklistItems = await page.locator('#checklist-section .checklist-item').count();
console.log(`  → ${checklistItems} pozycji checklist`);

// === Screenshot ===
await page.screenshot({ path: 'e2e_screenshot.png', fullPage: false });
console.log('\n✓ Screenshot: e2e_screenshot.png');

// === Errors summary ===
if (consoleErrors.length > 0) {
    console.log('\n⚠ Console errors:');
    consoleErrors.slice(0, 10).forEach(e => console.log('  -', e.slice(0, 200)));
}
if (networkErrors.length > 0) {
    console.log('\n⚠ Network 4xx/5xx:');
    networkErrors.slice(0, 10).forEach(e => console.log('  -', e));
}

await browser.close();
console.log('\n=== E2E test complete ===');

// E2E test Wizard 5-ekranowy + Role editor
import 'dotenv/config';
import { chromium } from 'playwright';

const SUPA = process.env.SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;

const link = await fetch(SUPA + '/auth/v1/admin/generate_link', {
    method: 'POST', headers: {Authorization: 'Bearer ' + SVC, apikey: SVC, 'Content-Type': 'application/json'},
    body: JSON.stringify({type: 'magiclink', email: 'tomekniedzwiecki@gmail.com'})
}).then(r => r.json());
const ver = await fetch(SUPA + '/auth/v1/verify', {
    method: 'POST', headers: {apikey: ANON, 'Content-Type': 'application/json'},
    body: JSON.stringify({type: 'magiclink', email: 'tomekniedzwiecki@gmail.com', token: link.email_otp})
}).then(r => r.json());

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
const issues = [];
const consoleErrors = [];
page.on('console', msg => {
    if (msg.type() === 'error') {
        const t = msg.text();
        if (!t.includes('favicon') && !t.includes('.map')) consoleErrors.push(t);
    }
});

console.log('=== TEST 1: Wizard otwiera się ===');
await page.goto('https://crm.getmypermit.pl/case-new.html', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

const title = await page.locator('.page-title').textContent();
console.log('Page title:', title);
if (title.includes('Wizard')) console.log('✓ Wizard page loaded');
else { console.log('✗ FAIL'); issues.push('Wizard page nie załadowana'); }

// Step 1: kategoria dropdown
const cats = await page.locator('#f-category option').count();
console.log('Kategorie w dropdown:', cats);
if (cats > 5) console.log('✓ Kategorie załadowane');
else issues.push('Brak kategorii');

// Wybierz kategorię + tryb
await page.selectOption('#f-category', 'pobyt_praca');
await page.waitForTimeout(500);
await page.selectOption('#f-kind', 'nowa_sprawa');
await page.waitForTimeout(500);

// Klik Dalej
await page.click('#btn-next');
await page.waitForTimeout(800);

const step2Active = await page.locator('.wizard-step[data-step="2"]').evaluate(el => el.classList.contains('active'));
console.log('Step 2 active:', step2Active);
if (step2Active) console.log('✓ Step 1 → 2 przejście OK');
else { issues.push('Step 1 → 2 nie zadziałało'); }

// Conditional employer-group widoczny dla pc_praca
const employerVisible = !(await page.locator('#employer-group').evaluate(el => el.classList.contains('hidden')));
console.log('Employer group visible (pc_praca):', employerVisible);
if (!employerVisible) issues.push('Employer group powinien być widoczny dla pobyt_praca');

// Validate step 2 — bez klienta
await page.click('#btn-next');
await page.waitForTimeout(800);
const stillStep2 = await page.locator('.wizard-step[data-step="2"]').evaluate(el => el.classList.contains('active'));
if (stillStep2) console.log('✓ Validacja step 2 blokuje bez klienta');
else issues.push('Validacja step 2 powinna zablokować bez klienta');

// === TEST 2: Role editor w istniejącej sprawie ===
console.log('\n=== TEST 2: Role editor w karcie sprawy ===');
const pg = (await import('pg')).default;
const c = new pg.Client({host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432,
    user: 'postgres.gfwsdrbywgmceateubyq', database: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD, ssl: {rejectUnauthorized: false}});
await c.connect();
const cs = await c.query("SELECT id FROM gmp_cases WHERE category='pobyt_praca' AND status='aktywna' LIMIT 1");
await c.end();
const caseId = cs.rows[0].id;

await page.goto(`https://crm.getmypermit.pl/case.html?id=${caseId}`, { waitUntil: 'networkidle' });
await page.waitForSelector('#case-content:not(.hidden)', { timeout: 15000 });
await page.waitForTimeout(2000);

// Klik Dane szczegółowe
await page.click('button.case-tab[data-tab="data"]');
await page.waitForTimeout(2500);

const roleSection = await page.locator('#role-assignments-section').textContent();
const rolesLoaded = !roleSection.includes('Ładuję');
console.log('Role section loaded:', rolesLoaded);
if (!rolesLoaded) issues.push('Role editor nie załadowany');

const roleRows = await page.locator('#role-assignments-section .role-row').count();
console.log('Liczba ról:', roleRows);
if (roleRows >= 5) console.log('✓ Role editor: ' + roleRows + ' ról widocznych');
else issues.push(`Role editor: tylko ${roleRows} ról (powinno być >=5)`);

// Screenshot
await page.screenshot({ path: 'e2e_wizard_screenshot.png' });
console.log('Screenshot: e2e_wizard_screenshot.png');

// === Summary ===
console.log('\n' + '='.repeat(50));
console.log(`Issues: ${issues.length}`);
issues.forEach(i => console.log(' ✗', i));

if (consoleErrors.length) {
    console.log('\nConsole errors:');
    consoleErrors.slice(0, 5).forEach(e => console.log(' -', e.slice(0, 200)));
}

await browser.close();
process.exit(issues.length > 0 ? 1 : 0);

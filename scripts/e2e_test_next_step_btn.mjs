// Test specyficzny: czy klik "Otwórz" w Co teraz przełącza zakładkę
import 'dotenv/config';
import { chromium } from 'playwright';

const SUPA = process.env.SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;

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

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1400, height: 900 }});
const session = {
    access_token: ver.access_token, refresh_token: ver.refresh_token,
    expires_in: ver.expires_in, expires_at: Math.floor(Date.now()/1000) + ver.expires_in,
    token_type: 'bearer', user: ver.user,
};
await context.addInitScript(({session}) => {
    localStorage.setItem('gmp-crm-auth', JSON.stringify(session));
}, {session});

const page = await context.newPage();
const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

await page.goto('https://crm.getmypermit.pl/case.html?id=9f32eade-7a38-4b5a-9226-3057f089df01',
    { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForSelector('#case-content:not(.hidden)', { timeout: 15000 });
await page.waitForTimeout(2000);

// 1. Sprawdź czy Co teraz banner widoczny + ile akcji
const bannerVisible = await page.locator('#next-steps').evaluate(el => !el.classList.contains('hidden'));
console.log('Next-steps banner visible:', bannerVisible);

const buttons = await page.locator('#next-steps-list button.next-steps-action').count();
console.log('Buttons "Otwórz" w banner:', buttons);

if (buttons === 0) {
    console.log('FAIL: brak buttonów');
    await browser.close();
    process.exit(1);
}

// 2. Aktywna zakładka przed klikiem
const activeBefore = await page.locator('.case-tab.active').getAttribute('data-tab');
console.log('Aktywna zakładka PRZED klikiem:', activeBefore);

// 3. Sprawdź data-action-url pierwszego buttona
const url = await page.locator('#next-steps-list button.next-steps-action').first().getAttribute('data-action-url');
console.log('action-url first button:', url);

// 4. Klik!
await page.locator('#next-steps-list button.next-steps-action').first().click();
await page.waitForTimeout(1500);

// 5. Aktywna zakładka po
const activeAfter = await page.locator('.case-tab.active').getAttribute('data-tab');
console.log('Aktywna zakładka PO kliku:', activeAfter);

if (activeBefore !== activeAfter) {
    console.log('✓ SUCCESS: zakładka przełączona ' + activeBefore + ' → ' + activeAfter);
} else {
    console.log('✗ FAIL: zakładka nie zmieniła się');
}

// 6. Sprawdź konsolę
if (errors.length) {
    console.log('\nConsole errors:');
    errors.forEach(e => console.log(' -', e.slice(0, 200)));
}

// Screenshot po kliku
await page.screenshot({ path: 'e2e_after_click.png', fullPage: false });
console.log('Screenshot: e2e_after_click.png');

await browser.close();

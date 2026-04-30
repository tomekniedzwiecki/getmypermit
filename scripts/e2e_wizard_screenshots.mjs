// Screenshoty wszystkich 5 ekranów nowego Wizardu
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
const context = await browser.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1.5 });
await context.addInitScript(({session}) => {
    localStorage.setItem('gmp-crm-auth', JSON.stringify(session));
}, {session});
const page = await context.newPage();

await page.goto('https://crm.getmypermit.pl/case-new.html', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2500);

// Step 1
await page.screenshot({ path: 'wizard_v2_step1.png', fullPage: true });
console.log('✓ wizard_v2_step1.png');

// Wybierz kategorię + tryb + Dalej
await page.selectOption('#f-category', 'pobyt_praca');
await page.waitForTimeout(800);
await page.click('#btn-next');
await page.waitForTimeout(800);

// Step 2
await page.screenshot({ path: 'wizard_v2_step2.png', fullPage: true });
console.log('✓ wizard_v2_step2.png');

// Wpisz coś w search klienta
await page.fill('#client-search', 'Wełniak');
await page.waitForTimeout(1500);
await page.screenshot({ path: 'wizard_v2_step2_search.png', fullPage: true });
console.log('✓ wizard_v2_step2_search.png');

// Wybierz pierwszy
const item = page.locator('#client-results .picker-item').first();
if (await item.count() > 0) {
    await item.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'wizard_v2_step2_selected.png', fullPage: true });
    console.log('✓ wizard_v2_step2_selected.png');
}

// Dalej do step 3
await page.click('#btn-next');
await page.waitForTimeout(800);
await page.screenshot({ path: 'wizard_v2_step3.png', fullPage: true });
console.log('✓ wizard_v2_step3.png');

// Klik pierwszej karty roli (otwiera modal)
const firstRole = page.locator('#roles-grid .role-card').first();
if (await firstRole.count() > 0) {
    await firstRole.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'wizard_v2_step3_modal.png', fullPage: true });
    console.log('✓ wizard_v2_step3_modal.png');
    // Zamknij
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
}

// Dalej step 4
await page.click('#btn-next');
await page.waitForTimeout(800);
await page.screenshot({ path: 'wizard_v2_step4.png', fullPage: true });
console.log('✓ wizard_v2_step4.png');

// Wpisz wynagrodzenie
await page.fill('#f-fee', '1500');
await page.waitForTimeout(500);
await page.screenshot({ path: 'wizard_v2_step4_filled.png', fullPage: true });
console.log('✓ wizard_v2_step4_filled.png');

// Dalej step 5
await page.click('#btn-next');
await page.waitForTimeout(800);
await page.screenshot({ path: 'wizard_v2_step5.png', fullPage: true });
console.log('✓ wizard_v2_step5.png');

await browser.close();
console.log('\n✓ Wszystkie screenshoty zapisane');

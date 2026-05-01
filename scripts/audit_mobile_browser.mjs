// Audit mobile responsiveness + accessibility + browser compatibility
// pre-launch GetMyPermit (CRM + landing pages)
// Idempotent: można uruchamiać wielokrotnie. Wyniki na stdout + screenshot do /tmp/mobile_audit/
import 'dotenv/config';
import { chromium, webkit, firefox } from 'playwright';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const SUPA = process.env.SUPABASE_URL;
const SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;

const SCREEN_DIR = '/tmp/mobile_audit';
fs.mkdirSync(SCREEN_DIR, { recursive: true });

const CRM_BASE = 'https://crm.getmypermit.pl';
const PUB_BASE = 'https://getmypermit.pl';

const BREAKPOINTS = [
  { w: 1600, h: 900, label: 'desktop' },
  { w: 1024, h: 768, label: 'tablet-l' },
  { w:  768, h: 1024, label: 'tablet-p' },
  { w:  600, h: 900, label: 'mobile-l' },
  { w:  390, h: 844, label: 'mobile' },
];

const issues = [];
function rec(level, area, msg) {
  issues.push({ level, area, msg });
  const icon = level === 'BLOCKER' ? '!!' : level === 'CRIT' ? '!' : level === 'MAJ' ? '*' : '-';
  console.log(`  ${icon} [${level}] ${area}: ${msg}`);
}

// --- 1. Auth -------------------------------------------------------
console.log('=== Authentication (magic link) ===');
const link = await fetch(SUPA + '/auth/v1/admin/generate_link', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + SVC, apikey: SVC, 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'magiclink', email: 'tomekniedzwiecki@gmail.com' }),
}).then(r => r.json());
if (!link.email_otp) {
  console.error('Brak email_otp', JSON.stringify(link));
  process.exit(1);
}
const ver = await fetch(SUPA + '/auth/v1/verify', {
  method: 'POST',
  headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'magiclink', email: 'tomekniedzwiecki@gmail.com', token: link.email_otp }),
}).then(r => r.json());
if (!ver.access_token) {
  console.error('Brak access_token', JSON.stringify(ver));
  process.exit(1);
}
const session = {
  access_token: ver.access_token,
  refresh_token: ver.refresh_token,
  expires_in: ver.expires_in,
  expires_at: Math.floor(Date.now() / 1000) + ver.expires_in,
  token_type: 'bearer',
  user: ver.user,
};
console.log('  OK: token_type=bearer, expires_in=' + ver.expires_in);

// --- 2. Pobierz UUID-y do testów -----------------------------------
console.log('\n=== Fetch test UUIDs from prod DB ===');
const c = new pg.Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432,
  user: 'postgres.gfwsdrbywgmceateubyq', database: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false },
});
await c.connect();
const caseRow = (await c.query("SELECT id FROM gmp_cases WHERE status='aktywna' LIMIT 1")).rows[0];
const empRow  = (await c.query('SELECT id FROM gmp_employers LIMIT 1')).rows[0];
await c.end();
if (!caseRow || !empRow) {
  console.error('Brak case/employer w DB');
  process.exit(1);
}
const CASE_ID = caseRow.id;
const EMP_ID  = empRow.id;
console.log('  case_id=' + CASE_ID.slice(0, 8) + ' emp_id=' + EMP_ID.slice(0, 8));

// helper: install console/network/pageerror listeners
function attachListeners(page) {
  const consoleErrors = [];
  const networkErrors = [];
  const pageErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const t = m.text();
      if (!t.includes('favicon') && !t.includes('.map') && !t.includes('sourceMappingURL')) {
        consoleErrors.push(t.slice(0, 200));
      }
    }
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && !r.url().includes('favicon') && !r.url().includes('.map')) {
      networkErrors.push(`${r.status()} ${r.url().split('?')[0].slice(-80)}`);
    }
  });
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
  return { consoleErrors, networkErrors, pageErrors };
}

// =====================================================================
// PART 1 + 2 — Mobile responsiveness + Accessibility (CRM)
// =====================================================================
const CRM_PAGES = [
  { key: 'dashboard', url: `${CRM_BASE}/dashboard.html` },
  { key: 'cases',     url: `${CRM_BASE}/cases.html` },
  { key: 'case',      url: `${CRM_BASE}/case.html?id=${CASE_ID}` },
  { key: 'kanban',    url: `${CRM_BASE}/kanban.html` },
  { key: 'employer',  url: `${CRM_BASE}/employer.html?id=${EMP_ID}` },
];

const mobileTable = []; // {page, results:{[bp]: {scroll, errs, hamb}}}
const a11yResults = []; // {page, btnNoLabel, inputNoLabel, hasH1, hasFocus, dContent}

console.log('\n=== Part 1+2: CRM responsiveness + a11y ===');
const browserCh = await chromium.launch({ headless: true });

for (const pg of CRM_PAGES) {
  console.log('\n-- ' + pg.key + ' --');
  const row = { page: pg.key, results: {} };

  for (const bp of BREAKPOINTS) {
    const ctx = await browserCh.newContext({ viewport: { width: bp.w, height: bp.h } });
    await ctx.addInitScript(({ s }) => {
      try { localStorage.setItem('gmp-crm-auth', JSON.stringify(s)); } catch (e) {}
    }, { s: session });
    const page = await ctx.newPage();
    const { consoleErrors, networkErrors, pageErrors } = attachListeners(page);

    let navOk = true;
    try {
      await page.goto(pg.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(2500);
    } catch (e) {
      navOk = false;
      console.log('    NAV FAIL @ ' + bp.label + ': ' + e.message.slice(0, 100));
    }

    let scrollX = false;
    let hamb = false;
    let hasMobileTopbar = false;
    if (navOk) {
      scrollX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1).catch(() => false);
      // Hamburger / mobile-topbar selectors
      hamb = await page.evaluate(() => {
        const sels = ['.mobile-hamburger', '.mobile-topbar', '#mobile-menu-toggle', '[data-mobile-toggle]', 'button.hamburger'];
        for (const s of sels) {
          const el = document.querySelector(s);
          if (el && el.offsetParent !== null) return true;
        }
        return false;
      }).catch(() => false);
      hasMobileTopbar = await page.evaluate(() => !!document.querySelector('.mobile-topbar, .mobile-hamburger, #mobile-menu-toggle')).catch(() => false);

      const shotPath = path.join(SCREEN_DIR, `${pg.key}_${bp.w}.png`).replace(/\\/g, '/');
      try {
        await page.screenshot({ path: shotPath, fullPage: false });
      } catch (e) {}

      // a11y check (only at desktop = 1600)
      if (bp.w === 1600) {
        const a11y = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const noLabel = btns.filter(b => {
            if (b.getAttribute('aria-label')) return false;
            if (b.getAttribute('title')) return false;
            const txt = (b.textContent || '').replace(/\s+/g, '').trim();
            if (txt.length > 0) return false;
            return true;
          }).length;

          const inputs = Array.from(document.querySelectorAll('input, select, textarea')).filter(i => {
            const t = (i.getAttribute('type') || '').toLowerCase();
            return t !== 'hidden' && t !== 'submit' && t !== 'button';
          });
          const noInputLabel = inputs.filter(i => {
            if (i.getAttribute('aria-label')) return false;
            if (i.getAttribute('aria-labelledby')) return false;
            if (i.getAttribute('placeholder') && (i.getAttribute('type') === 'search' || i.id === '')) {
              // placeholder alone is not enough but flag separately
            }
            if (i.id) {
              const lab = document.querySelector(`label[for="${CSS.escape(i.id)}"]`);
              if (lab) return false;
            }
            // wrapped in label
            let p = i.parentElement;
            while (p) {
              if (p.tagName === 'LABEL') return false;
              p = p.parentElement;
            }
            return true;
          }).length;

          const hasH1 = !!document.querySelector('h1');

          // focus styles
          let hasFocus = false;
          try {
            for (const ss of Array.from(document.styleSheets)) {
              let rules;
              try { rules = ss.cssRules; } catch (e) { continue; }
              if (!rules) continue;
              for (const r of Array.from(rules)) {
                const t = (r.cssText || '');
                if (/:focus(-visible)?\b/.test(t) && /outline\s*:/.test(t)) {
                  hasFocus = true; break;
                }
              }
              if (hasFocus) break;
            }
          } catch (e) {}
          return { noLabel, noInputLabel, hasH1, hasFocus, btnTotal: btns.length, inputTotal: inputs.length };
        }).catch(() => null);
        if (a11y) {
          a11yResults.push({ page: pg.key, ...a11y });
        }
      }
    }

    row.results[bp.w] = {
      ok: navOk,
      scrollX,
      hamb,
      hasMobileTopbar,
      consoleCount: consoleErrors.length,
      networkCount: networkErrors.length,
      consoleErrors: consoleErrors.slice(0, 3),
      networkErrors: networkErrors.slice(0, 3),
    };
    console.log(`    ${bp.label} ${bp.w}px: scrollX=${scrollX} hamb=${hamb} cErr=${consoleErrors.length} nErr=${networkErrors.length}`);

    // Issue recording
    if (bp.w < 900 && !hasMobileTopbar) {
      rec('MAJ', pg.key + '@' + bp.w, 'Brak mobile-topbar/hamburger przy <900px');
    }
    if (scrollX && bp.w < 768) {
      rec('MAJ', pg.key + '@' + bp.w, 'Horizontal scroll na mobile');
    }
    if (consoleErrors.length > 0) {
      rec('MAJ', pg.key + '@' + bp.w, `Console errors (${consoleErrors.length}): ` + consoleErrors[0].slice(0, 90));
    }
    if (networkErrors.length > 0) {
      rec('CRIT', pg.key + '@' + bp.w, `Network 4xx/5xx (${networkErrors.length}): ` + networkErrors[0]);
    }

    await ctx.close();
  }
  mobileTable.push(row);
}

// =====================================================================
// PART 3 — Browser compatibility (chromium / webkit / firefox)
// =====================================================================
console.log('\n=== Part 3: Browser compatibility ===');
const BROWSER_PAGES = [
  { key: 'index',     url: `${CRM_BASE}/index.html`,                   auth: false },
  { key: 'dashboard', url: `${CRM_BASE}/dashboard.html`,               auth: true },
  { key: 'case',      url: `${CRM_BASE}/case.html?id=${CASE_ID}`,      auth: true },
];
const BROWSERS = [
  { name: 'chromium', driver: chromium },
  { name: 'webkit',   driver: webkit },
  { name: 'firefox',  driver: firefox },
];
const browserTable = []; // {browser, page, cErr, nErr, pErr, dcl, esmOk}

for (const b of BROWSERS) {
  console.log('\n-- ' + b.name + ' --');
  let br;
  try {
    br = await b.driver.launch({ headless: true });
  } catch (e) {
    console.log('  LAUNCH FAIL: ' + e.message.slice(0, 200));
    for (const pg of BROWSER_PAGES) {
      browserTable.push({ browser: b.name, page: pg.key, cErr: -1, nErr: -1, pErr: -1, dcl: -1, esmOk: null, error: e.message.slice(0, 80) });
    }
    rec('BLOCKER', 'browser:' + b.name, 'Browser launch failed: ' + e.message.slice(0, 120));
    continue;
  }
  for (const pg of BROWSER_PAGES) {
    const ctx = await br.newContext({ viewport: { width: 1400, height: 900 } });
    if (pg.auth) {
      await ctx.addInitScript(({ s }) => {
        try { localStorage.setItem('gmp-crm-auth', JSON.stringify(s)); } catch (e) {}
      }, { s: session });
    }
    const page = await ctx.newPage();
    const { consoleErrors, networkErrors, pageErrors } = attachListeners(page);
    const t0 = Date.now();
    let dcl = -1;
    let navOk = true;
    page.on('domcontentloaded', () => { if (dcl < 0) dcl = Date.now() - t0; });
    try {
      await page.goto(pg.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
    } catch (e) {
      navOk = false;
      console.log(`    ${pg.key}: NAV FAIL ${e.message.slice(0, 90)}`);
    }
    // ESM check on case.html
    let esmOk = null;
    if (navOk && pg.key === 'case') {
      esmOk = await page.evaluate(() => {
        const mods = Array.from(document.querySelectorAll('script[type="module"]'));
        return mods.length > 0;
      }).catch(() => null);
    }
    browserTable.push({
      browser: b.name, page: pg.key,
      cErr: consoleErrors.length, nErr: networkErrors.length, pErr: pageErrors.length,
      dcl, esmOk, navOk,
      consoleSample: consoleErrors.slice(0, 2),
      pageSample: pageErrors.slice(0, 2),
    });
    console.log(`    ${pg.key}: cErr=${consoleErrors.length} nErr=${networkErrors.length} pErr=${pageErrors.length} dcl=${dcl}ms esm=${esmOk}`);
    if (pageErrors.length > 0) {
      rec('CRIT', `${b.name}/${pg.key}`, `pageerror: ` + pageErrors[0].slice(0, 100));
    }
    if (consoleErrors.length > 3) {
      rec('MAJ', `${b.name}/${pg.key}`, `${consoleErrors.length} console errors`);
    }
    if (networkErrors.length > 0) {
      rec('CRIT', `${b.name}/${pg.key}`, `${networkErrors.length} network 4xx/5xx`);
    }
    await ctx.close();
  }
  await br.close();
}

// =====================================================================
// PART 4 — Public landing pages (chromium only, 3 breakpoints)
// =====================================================================
console.log('\n=== Part 4: Public landing pages ===');
const LANDING_PAGES = [
  { key: 'home',     url: `${PUB_BASE}/` },
  { key: 'lead',     url: `${PUB_BASE}/lead.html` },
  { key: 'calendar', url: `${PUB_BASE}/calendar.html` },
  { key: 'avail',    url: `${PUB_BASE}/availability.html` },
  { key: 'lawyers',  url: `${PUB_BASE}/lawyers.html` },
  { key: 'privacy',  url: `${PUB_BASE}/polityka-prywatnosci.html` },
  { key: 'tos',      url: `${PUB_BASE}/regulamin.html` },
];
const PUB_BPS = [
  { w: 1600, h: 900 },
  { w:  768, h: 1024 },
  { w:  390, h: 844 },
];
const landingTable = []; // {page, results:{[w]: {ok, scrollX, cErr, nErr}}}

for (const lp of LANDING_PAGES) {
  console.log('\n-- ' + lp.key + ' --');
  const row = { page: lp.key, results: {} };
  for (const bp of PUB_BPS) {
    const ctx = await browserCh.newContext({ viewport: { width: bp.w, height: bp.h } });
    const page = await ctx.newPage();
    const { consoleErrors, networkErrors } = attachListeners(page);
    let navOk = true;
    try {
      await page.goto(lp.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(2000);
    } catch (e) { navOk = false; }
    const scrollX = navOk ? await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1).catch(() => false) : false;
    if (navOk) {
      try {
        await page.screenshot({ path: path.join(SCREEN_DIR, `landing_${lp.key}_${bp.w}.png`).replace(/\\/g, '/') });
      } catch (e) {}
    }
    row.results[bp.w] = {
      ok: navOk,
      scrollX,
      cErr: consoleErrors.length,
      nErr: networkErrors.length,
      consoleSample: consoleErrors.slice(0, 2),
    };
    console.log(`    ${bp.w}px: ok=${navOk} scrollX=${scrollX} cErr=${consoleErrors.length} nErr=${networkErrors.length}`);
    if (!navOk) rec('CRIT', `landing:${lp.key}@${bp.w}`, 'Navigation failed');
    if (scrollX && bp.w < 768) rec('MAJ', `landing:${lp.key}@${bp.w}`, 'Horizontal scroll');
    if (networkErrors.length > 0) rec('MAJ', `landing:${lp.key}@${bp.w}`, `${networkErrors.length} network 4xx/5xx`);
    await ctx.close();
  }
  landingTable.push(row);
}

await browserCh.close();

// =====================================================================
// REPORT
// =====================================================================
function statusIcon(r) {
  if (!r || !r.ok) return 'X';
  if (r.networkCount > 0 || r.networkErrors?.length > 0) return 'X';
  if (r.consoleCount > 0 || r.scrollX) return '!';
  return 'OK';
}

console.log('\n\n=== REPORT ===\n');

console.log('### Tabela 1: 5 CRM stron x 5 breakpointów');
const bpHeads = BREAKPOINTS.map(b => b.w + 'px').join(' | ');
console.log('| page       | ' + bpHeads + ' |');
console.log('|------------|' + BREAKPOINTS.map(() => '------').join('|') + '|');
for (const r of mobileTable) {
  const cells = BREAKPOINTS.map(bp => {
    const v = r.results[bp.w];
    if (!v || !v.ok) return ' X   ';
    const flags = [];
    if (v.scrollX) flags.push('scr');
    if (v.consoleCount) flags.push(`c${v.consoleCount}`);
    if (v.networkCount) flags.push(`n${v.networkCount}`);
    if (bp.w < 900 && !v.hasMobileTopbar) flags.push('!hamb');
    return flags.length ? ' ! ' + flags.join(',') : ' OK  ';
  });
  console.log(`| ${r.page.padEnd(10)} | ${cells.join(' | ')} |`);
}

console.log('\n### Tabela 2: 3 stron x 3 browsery');
console.log('| browser  | page       | cErr | nErr | pErr | dcl(ms) | esm | status |');
console.log('|----------|------------|------|------|------|---------|-----|--------|');
for (const r of browserTable) {
  const status = (r.cErr === -1) ? 'BROWSER FAIL' : (r.pErr > 0 || r.nErr > 0 || r.cErr > 5) ? 'X' : (r.cErr > 0) ? '!' : 'OK';
  console.log(`| ${r.browser.padEnd(8)} | ${r.page.padEnd(10)} | ${String(r.cErr).padEnd(4)} | ${String(r.nErr).padEnd(4)} | ${String(r.pErr).padEnd(4)} | ${String(r.dcl).padEnd(7)} | ${r.esmOk === null ? '-  ' : r.esmOk ? 'yes' : 'no '} | ${status}     |`);
}

console.log('\n### Tabela 3: 7 landing pages x 3 breakpointów');
console.log('| page    | 1600 | 768  | 390  |');
console.log('|---------|------|------|------|');
for (const r of landingTable) {
  const cells = PUB_BPS.map(bp => {
    const v = r.results[bp.w];
    if (!v || !v.ok) return 'X   ';
    const flags = [];
    if (v.scrollX) flags.push('scr');
    if (v.cErr) flags.push(`c${v.cErr}`);
    if (v.nErr) flags.push(`n${v.nErr}`);
    return flags.length ? '!' + flags.join(',').slice(0, 4) : 'OK ';
  });
  console.log(`| ${r.page.padEnd(7)} | ${cells.map(c => c.padEnd(4)).join(' | ')} |`);
}

console.log('\n### A11y per page (breakpoint 1600)');
console.log('| page       | btn no-label | input no-label | h1 | :focus |');
console.log('|------------|--------------|----------------|----|--------|');
for (const a of a11yResults) {
  console.log(`| ${a.page.padEnd(10)} | ${String(a.noLabel).padEnd(12)} | ${String(a.noInputLabel).padEnd(14)} | ${a.hasH1 ? 'Y' : 'N'}  | ${a.hasFocus ? 'Y' : 'N'}      |`);
}

console.log('\n### Issues (BLOCKER / CRIT / MAJ)');
const grouped = { BLOCKER: [], CRIT: [], MAJ: [] };
for (const i of issues) (grouped[i.level] || []).push(i);
for (const lvl of ['BLOCKER', 'CRIT', 'MAJ']) {
  console.log(`-- ${lvl} (${grouped[lvl].length}) --`);
  for (const i of grouped[lvl].slice(0, 30)) console.log(`  ${i.area}: ${i.msg}`);
}

console.log('\n### Top a11y issues');
for (const a of a11yResults.sort((x, y) => (y.noLabel + y.noInputLabel) - (x.noLabel + x.noInputLabel)).slice(0, 10)) {
  console.log(`  ${a.page}: ${a.noLabel} unlabeled buttons, ${a.noInputLabel} inputs without label, h1=${a.hasH1}, focus=${a.hasFocus}`);
}

console.log('\n### Sample screenshots');
const samples = [
  'dashboard_390.png', 'cases_390.png', 'case_390.png', 'kanban_390.png', 'employer_390.png',
  'dashboard_1024.png', 'cases_1600.png',
  'landing_home_390.png', 'landing_lead_390.png', 'landing_calendar_768.png',
];
for (const f of samples) {
  const p = path.join(SCREEN_DIR, f);
  if (fs.existsSync(p)) console.log('  ' + p.replace(/\\/g, '/'));
}

// Save JSON for downstream tooling
const out = {
  ts: new Date().toISOString(),
  mobile: mobileTable,
  browser: browserTable,
  landing: landingTable,
  a11y: a11yResults,
  issues,
};
fs.writeFileSync(path.join(SCREEN_DIR, 'audit_result.json'), JSON.stringify(out, null, 2));
console.log('\nJSON: ' + path.join(SCREEN_DIR, 'audit_result.json').replace(/\\/g, '/'));
console.log('\nDone.');

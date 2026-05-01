import 'dotenv/config';

const URL = 'https://gfwsdrbywgmceateubyq.supabase.co';
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE) {
  console.error('Brak SUPABASE_SERVICE_ROLE_KEY w .env');
  process.exit(1);
}

const TARGET = 'tomekniedzwiecki@gmail.com'; // user's email z auto-memory

console.log('Test 1: template lead_confirmation →', TARGET);
const r1 = await fetch(URL + '/functions/v1/send-email', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + SERVICE, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: TARGET,
    template: 'lead_confirmation',
    vars: { name: 'Tomek (test)' },
  }),
});
const j1 = await r1.json();
console.log('  status:', r1.status, 'body:', JSON.stringify(j1));

if (r1.status === 200 && j1.success) {
  console.log('\n✅ SEND-EMAIL DZIAŁA. Sprawdź skrzynkę', TARGET, '(także SPAM).');
} else {
  console.log('\n❌ FAIL — sprawdź:');
  console.log('  - czy RESEND_API_KEY jest valid (re_xxx format)');
  console.log('  - czy domena getmypermit.pl jest verified w resend.com → Domains');
  console.log('  - czy DKIM resend._domainkey.getmypermit.pl jest na prod (audyt mówi że tak)');
}

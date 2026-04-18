// MOS 2.0 Playbook — rendering personalized step-by-step guide
const SUPABASE_URL = 'https://gfwsdrbywgmceateubyq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd3NkcmJ5d2dtY2VhdGV1YnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0Mzg1MjksImV4cCI6MjA5MjAxNDUyOX0.Qnn4MbtfApJ8sVwkpXNqNoHCBcGymS2U04kRLIVRta0';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Multi-language playbook strings
const PB_STRINGS = {
    pl: {
        greeting: 'Twój Playbook MOS 2.0',
        greeting_name: 'Cześć {name}! Twój Playbook MOS 2.0',
        sub: 'Krok-po-kroku jak wypełnić oficjalny wniosek',
        approved: 'Zatwierdzone przez kancelarię',
        step_1_title: 'Przygotuj się',
        step_1_desc: 'Upewnij się że masz wszystko co potrzebne',
        step_1_items: [
            'PESEL (numer identyfikacyjny)',
            'Profil Zaufany na login.gov.pl (lub e-Dowód)',
            'Telefon do SMS / mObywatel (2FA)',
            'Dobre łącze internetowe',
        ],
        step_2_title: 'Otwórz MOS 2.0',
        step_2_desc: 'Oficjalny portal UDSC',
        step_2_cta: 'Otwórz MOS 2.0 →',
        step_3_title: 'Zaloguj się Profilem Zaufanym',
        step_3_desc: 'Na stronie MOS kliknij „Zaloguj się Profilem Zaufanym"',
        step_4_title: 'Wybierz typ wniosku',
        step_4_desc: 'Po zalogowaniu wybierz: "Nowy wniosek"',
        step_5_title: 'Wypełnij dane osobowe',
        step_5_desc: 'Skopiuj te wartości po kolei:',
        step_6_title: 'Dodaj dane kontaktowe',
        step_7_title: 'Adres w Polsce',
        step_8_title: 'Dane o pracy (jeśli dotyczy)',
        step_9_title: 'Wybierz cel wniosku',
        step_10_title: 'Dołącz załączniki',
        step_10_desc: 'Pobierz te pliki i załącz je w MOS 2.0 (każdy max 10MB, łącznie max 50MB)',
        step_11_title: 'Sprawdź wszystko przed podpisem',
        step_11_desc: 'UWAGA: Po podpisie nie da się nic zmienić!',
        step_11_items: [
            'Czy wszystkie dane zgadzają się z paszportem?',
            'Czy wszystkie załączniki są dodane?',
            'Czy data urodzenia jest prawidłowa (YYYY-MM-DD)?',
            'Czy numer paszportu nie ma literówki?',
        ],
        step_12_title: 'Podpisz Profilem Zaufanym',
        step_12_desc: 'Kliknij „Podpisz i wyślij". Zostaniesz przekierowany na login.gov.pl.',
        step_13_title: 'Zapisz UPO',
        step_13_desc: 'Po podpisie zobaczysz Urzędowe Poświadczenie Odbioru (UPO). To twój dowód złożenia — zrób zrzut ekranu LUB pobierz PDF.',
        step_13_warn: 'To ważne — zachowaj UPO. Bez niego trudno udowodnić że złożyłeś wniosek.',
        copy: 'Kopiuj',
        copied: 'Skopiowano!',
        download: 'Pobierz',
        open_in_mos: 'Otwórz MOS 2.0',
        help_whatsapp: 'Pomoc na WhatsApp',
    },
    en: {
        greeting: 'Your MOS 2.0 Playbook',
        greeting_name: 'Hi {name}! Your MOS 2.0 Playbook',
        sub: 'Step-by-step guide to fill the official application',
        approved: 'Approved by law firm',
        step_1_title: 'Prepare yourself',
        step_1_desc: 'Make sure you have everything needed',
        step_1_items: [
            'PESEL (Polish ID number)',
            'Trusted Profile at login.gov.pl (or e-ID)',
            'Phone for SMS / mObywatel (2FA)',
            'Good internet connection',
        ],
        step_2_title: 'Open MOS 2.0',
        step_2_desc: 'Official UDSC portal',
        step_2_cta: 'Open MOS 2.0 →',
        step_3_title: 'Log in with Trusted Profile',
        step_3_desc: 'On MOS page click "Zaloguj się Profilem Zaufanym" (Login with Trusted Profile)',
        step_4_title: 'Choose application type',
        step_4_desc: 'After login choose: "Nowy wniosek" (New application)',
        step_5_title: 'Fill personal data',
        step_5_desc: 'Copy these values one by one:',
        step_6_title: 'Add contact details',
        step_7_title: 'Your Poland address',
        step_8_title: 'Employment data (if applicable)',
        step_9_title: 'Choose application purpose',
        step_10_title: 'Attach documents',
        step_10_desc: 'Download these files and attach them in MOS 2.0 (each max 10MB, total max 50MB)',
        step_11_title: 'Review everything before signing',
        step_11_desc: 'IMPORTANT: After signing you CANNOT change anything!',
        step_11_items: [
            'Do all data match your passport?',
            'Are all attachments uploaded?',
            'Is the birth date correct (YYYY-MM-DD)?',
            'No typo in passport number?',
        ],
        step_12_title: 'Sign with Trusted Profile',
        step_12_desc: 'Click "Podpisz i wyślij" (Sign and send). You\'ll be redirected to login.gov.pl.',
        step_13_title: 'Save UPO',
        step_13_desc: 'After signing you\'ll see UPO (official receipt). This is your proof of submission — screenshot it AND download PDF.',
        step_13_warn: 'This is important — keep your UPO safe.',
        copy: 'Copy',
        copied: 'Copied!',
        download: 'Download',
        open_in_mos: 'Open MOS 2.0',
        help_whatsapp: 'WhatsApp help',
    },
    uk: {
        greeting: 'Ваш MOS 2.0 Playbook',
        greeting_name: 'Привіт {name}! Ваш MOS 2.0 Playbook',
        sub: 'Покроковий гід для заповнення офіційної заявки',
        approved: 'Затверджено юридичною фірмою',
        step_1_title: 'Підготуйтеся',
        step_1_desc: 'Переконайтеся, що маєте все необхідне',
        step_1_items: [
            'PESEL (польський ідентифікаційний номер)',
            'Довірений профіль на login.gov.pl (або e-ID)',
            'Телефон для SMS / mObywatel (2FA)',
            'Хороший інтернет',
        ],
        step_2_title: 'Відкрийте MOS 2.0',
        step_2_desc: 'Офіційний портал UDSC',
        step_2_cta: 'Відкрити MOS 2.0 →',
        step_3_title: 'Увійдіть через Довірений профіль',
        step_3_desc: 'На сторінці MOS натисніть "Zaloguj się Profilem Zaufanym"',
        step_4_title: 'Виберіть тип заявки',
        step_4_desc: 'Після входу виберіть: "Nowy wniosek"',
        step_5_title: 'Заповніть особисті дані',
        step_5_desc: 'Скопіюйте ці значення по черзі:',
        step_6_title: 'Додайте контактні дані',
        step_7_title: 'Ваша адреса в Польщі',
        step_8_title: 'Дані про роботу (якщо є)',
        step_9_title: 'Виберіть мету заявки',
        step_10_title: 'Додайте документи',
        step_10_desc: 'Завантажте ці файли та прикріпіть у MOS 2.0 (кожен макс 10MB, всього 50MB)',
        step_11_title: 'Перевірте все перед підписом',
        step_11_desc: 'УВАГА: Після підпису неможливо нічого змінити!',
        step_11_items: [
            'Чи всі дані відповідають паспорту?',
            'Чи всі додатки завантажені?',
            'Чи правильна дата народження?',
            'Без помилок у номері паспорта?',
        ],
        step_12_title: 'Підпишіть Довіреним профілем',
        step_12_desc: 'Натисніть "Podpisz i wyślij". Будете перенаправлені на login.gov.pl.',
        step_13_title: 'Збережіть UPO',
        step_13_desc: 'Після підпису ви побачите UPO (офіційна квитанція). Зробіть скріншот І завантажте PDF.',
        step_13_warn: 'Це важливо — збережіть UPO.',
        copy: 'Копіювати',
        copied: 'Скопійовано!',
        download: 'Завантажити',
        open_in_mos: 'Відкрити MOS 2.0',
        help_whatsapp: 'Допомога в WhatsApp',
    },
    ru: {
        greeting: 'Ваш MOS 2.0 Playbook',
        greeting_name: 'Привет {name}! Ваш MOS 2.0 Playbook',
        sub: 'Пошаговое руководство для заполнения официальной заявки',
        approved: 'Утверждено юридической фирмой',
        step_1_title: 'Подготовьтесь',
        step_1_desc: 'Убедитесь что у вас есть всё необходимое',
        step_1_items: [
            'PESEL (польский идентификационный номер)',
            'Доверенный профиль на login.gov.pl (или e-ID)',
            'Телефон для SMS / mObywatel (2FA)',
            'Хорошее интернет-соединение',
        ],
        step_2_title: 'Откройте MOS 2.0',
        step_2_desc: 'Официальный портал UDSC',
        step_2_cta: 'Открыть MOS 2.0 →',
        step_3_title: 'Войдите через Доверенный профиль',
        step_3_desc: 'На странице MOS нажмите "Zaloguj się Profilem Zaufanym"',
        step_4_title: 'Выберите тип заявки',
        step_4_desc: 'После входа выберите: "Nowy wniosek"',
        step_5_title: 'Заполните личные данные',
        step_5_desc: 'Скопируйте эти значения по очереди:',
        step_6_title: 'Добавьте контактные данные',
        step_7_title: 'Ваш адрес в Польше',
        step_8_title: 'Данные о работе (если есть)',
        step_9_title: 'Выберите цель заявки',
        step_10_title: 'Прикрепите документы',
        step_10_desc: 'Скачайте эти файлы и прикрепите в MOS 2.0 (каждый макс 10MB, всего 50MB)',
        step_11_title: 'Проверьте всё перед подписью',
        step_11_desc: 'ВНИМАНИЕ: После подписи ничего нельзя изменить!',
        step_11_items: [
            'Все ли данные совпадают с паспортом?',
            'Все ли приложения загружены?',
            'Правильная ли дата рождения?',
            'Без опечаток в номере паспорта?',
        ],
        step_12_title: 'Подпишите Доверенным профилем',
        step_12_desc: 'Нажмите "Podpisz i wyślij". Вас перенаправят на login.gov.pl.',
        step_13_title: 'Сохраните UPO',
        step_13_desc: 'После подписи вы увидите UPO (официальная квитанция). Сделайте скриншот И скачайте PDF.',
        step_13_warn: 'Это важно — сохраните UPO.',
        copy: 'Копировать',
        copied: 'Скопировано!',
        download: 'Скачать',
        open_in_mos: 'Открыть MOS 2.0',
        help_whatsapp: 'Помощь в WhatsApp',
    },
    hi: {
        greeting: 'आपका MOS 2.0 Playbook',
        greeting_name: 'नमस्ते {name}! आपका MOS 2.0 Playbook',
        sub: 'आधिकारिक आवेदन भरने के लिए चरण-दर-चरण गाइड',
        approved: 'लॉ फर्म द्वारा स्वीकृत',
        step_1_title: 'तैयार हो जाइए',
        step_1_desc: 'सुनिश्चित करें कि आपके पास सब कुछ है',
        step_1_items: [
            'PESEL (पोलिश पहचान संख्या)',
            'login.gov.pl पर Trusted Profile (या e-ID)',
            'SMS के लिए फोन / mObywatel (2FA)',
            'अच्छा इंटरनेट कनेक्शन',
        ],
        step_2_title: 'MOS 2.0 खोलें',
        step_2_desc: 'आधिकारिक UDSC पोर्टल',
        step_2_cta: 'MOS 2.0 खोलें →',
        step_3_title: 'Trusted Profile से लॉगिन करें',
        step_3_desc: 'MOS पेज पर "Zaloguj się Profilem Zaufanym" पर क्लिक करें',
        step_4_title: 'आवेदन प्रकार चुनें',
        step_4_desc: 'लॉगिन के बाद चुनें: "Nowy wniosek"',
        step_5_title: 'व्यक्तिगत डेटा भरें',
        step_5_desc: 'इन मानों को एक-एक करके कॉपी करें:',
        step_6_title: 'संपर्क विवरण जोड़ें',
        step_7_title: 'पोलैंड में आपका पता',
        step_8_title: 'रोज़गार डेटा (यदि लागू हो)',
        step_9_title: 'आवेदन का उद्देश्य चुनें',
        step_10_title: 'दस्तावेज़ संलग्न करें',
        step_10_desc: 'इन फ़ाइलों को डाउनलोड करें और MOS 2.0 में अटैच करें (प्रत्येक अधिकतम 10MB, कुल 50MB)',
        step_11_title: 'साइन करने से पहले सब कुछ जांचें',
        step_11_desc: 'महत्वपूर्ण: साइन करने के बाद आप कुछ भी नहीं बदल सकते!',
        step_11_items: [
            'क्या सभी डेटा आपके पासपोर्ट से मेल खाते हैं?',
            'क्या सभी अटैचमेंट अपलोड हैं?',
            'क्या जन्म तिथि सही है?',
            'पासपोर्ट नंबर में कोई गलती नहीं?',
        ],
        step_12_title: 'Trusted Profile से साइन करें',
        step_12_desc: '"Podpisz i wyślij" पर क्लिक करें। आपको login.gov.pl पर रीडायरेक्ट किया जाएगा।',
        step_13_title: 'UPO सहेजें',
        step_13_desc: 'साइन करने के बाद आप UPO (आधिकारिक रसीद) देखेंगे। स्क्रीनशॉट लें और PDF डाउनलोड करें।',
        step_13_warn: 'यह महत्वपूर्ण है — अपना UPO सुरक्षित रखें।',
        copy: 'कॉपी',
        copied: 'कॉपी हो गया!',
        download: 'डाउनलोड',
        open_in_mos: 'MOS 2.0 खोलें',
        help_whatsapp: 'WhatsApp मदद',
    },
};

function t(key, params = {}) {
    const lang = intakeI18n.getCurrentLanguage();
    let val = PB_STRINGS[lang]?.[key] ?? PB_STRINGS.en?.[key] ?? key;
    Object.entries(params).forEach(([k, v]) => val = val.replace(`{${k}}`, v));
    return val;
}

let intake = null;
let docs = [];

(async function init() {
    const token = new URLSearchParams(location.search).get('t');
    if (!token) return showError();

    const { data } = await db.from('gmp_intake_tokens').select('*').eq('token', token).maybeSingle();
    if (!data || !['submitted', 'approved'].includes(data.status)) return showError();

    intake = data;
    intakeI18n.setLanguage(data.language || 'en');
    document.documentElement.lang = data.language || 'en';

    const { data: d } = await db.from('gmp_intake_documents').select('*').eq('intake_id', intake.id);
    docs = d || [];

    document.getElementById('state-loading').classList.add('hidden');
    document.getElementById('pb-main').classList.remove('hidden');

    renderLangBtn();
    render();
})();

function showError() {
    document.getElementById('state-loading').classList.add('hidden');
    document.getElementById('state-error').classList.remove('hidden');
}

function renderLangBtn() {
    const lang = intakeI18n.getCurrentLanguage();
    document.getElementById('lang-flag').textContent = intakeI18n.LANG_FLAGS[lang];
    document.getElementById('lang-code').textContent = lang.toUpperCase();
    document.getElementById('lang-btn').onclick = () => {
        // Simple cycle through langs
        const all = intakeI18n.SUPPORTED;
        const idx = all.indexOf(lang);
        const next = all[(idx + 1) % all.length];
        intakeI18n.setLanguage(next);
        document.documentElement.lang = next;
        render();
        renderLangBtn();
    };
}

function render() {
    const d = intake.data || {};
    const name = d.first_name || '';
    document.getElementById('pb-greeting').textContent = name ? t('greeting_name', { name }) : t('greeting');
    document.getElementById('pb-sub').textContent = t('sub');
    document.getElementById('pb-meta').innerHTML = `<i class="ph ph-check-circle" style="color: var(--success)"></i> ${t('approved')}`;

    const steps = [];

    // Step 1: Prepare
    steps.push(renderCheckStep('1', 'step_1'));

    // Step 2: Open MOS
    steps.push(`
        <div class="pb-step" data-step="2">
            <div class="pb-step-head"><div class="pb-step-num">2</div><h2>${t('step_2_title')}</h2></div>
            <div class="desc">${t('step_2_desc')}</div>
            <a class="pb-cta" href="https://mos.cudzoziemcy.gov.pl" target="_blank" rel="noopener" onclick="markStepDone(2)">
                <i class="ph ph-arrow-square-out"></i> ${t('step_2_cta')}
            </a>
        </div>`);

    // Step 3: Login
    steps.push(renderSimpleStep('3', 'step_3'));

    // Step 4: Choose type
    steps.push(renderSimpleStep('4', 'step_4'));

    // Step 5: Personal data with copy buttons
    const personalFields = [
        { label: 'Imię / First name', val: d.first_name },
        { label: 'Nazwisko / Last name', val: d.last_name },
        { label: 'Data urodzenia / Birth date', val: d.birth_date },
        { label: 'Miejsce urodzenia', val: d.birth_place },
        { label: 'Obywatelstwo / Nationality', val: d.nationality },
        { label: 'Płeć / Gender', val: d.gender },
        { label: 'Nr paszportu / Passport no', val: d.passport_number },
        { label: 'Paszport ważny do', val: d.passport_expiry },
    ];
    steps.push(renderCopyStep('5', 'step_5', personalFields));

    // Step 6: Contact
    const contactFields = [
        { label: 'Telefon / Phone', val: d.phone },
        { label: 'Email', val: d.email },
    ];
    steps.push(renderCopyStep('6', 'step_6', contactFields));

    // Step 7: Address
    const addressFields = [
        { label: 'Kod pocztowy / ZIP', val: d.zip },
        { label: 'Miasto / City', val: d.city },
        { label: 'Ulica / Street', val: d.street },
        { label: 'Nr domu / Building', val: d.building },
        { label: 'Mieszkanie / Flat', val: d.flat },
        { label: 'Województwo', val: d.voivodeship === 'dolnoslaskie' ? 'dolnośląskie' : d.voivodeship },
    ];
    steps.push(renderCopyStep('7', 'step_7', addressFields));

    // Step 8: Employment (conditional)
    if (d.has_job === 'yes') {
        const empFields = [
            { label: 'NIP pracodawcy', val: d.employer_nip },
            { label: 'Nazwa pracodawcy', val: d.employer_name },
            { label: 'Stanowisko', val: d.position },
            { label: 'Wynagrodzenie brutto (PLN)', val: d.salary_gross },
            { label: 'Data rozpoczęcia umowy', val: d.contract_start },
        ];
        steps.push(renderCopyStep('8', 'step_8', empFields));
    }

    // Step 9: Purpose
    const purposeMap = { temporary: 'Pobyt czasowy (TRC)', permanent: 'Pobyt stały', eu_resident: 'Rezydent długoterminowy UE' };
    const groundMap = { work: 'Praca', blue_card: 'Błękitna karta UE', business: 'Działalność gospodarcza', studies: 'Studia', family: 'Połączenie z rodziną', spouse_pl: 'Małżeństwo z obywatelem RP', other: 'Inna' };
    const purposeFields = [
        { label: 'Typ wniosku / Type', val: purposeMap[d.purpose] || d.purpose },
        { label: 'Podstawa prawna / Ground', val: groundMap[d.ground] || d.ground },
    ];
    steps.push(renderCopyStep('9', 'step_9', purposeFields));

    // Step 10: Documents
    steps.push(renderDocsStep('10'));

    // Step 11: Review checklist
    steps.push(renderCheckStep('11', 'step_11'));

    // Step 12: Sign
    steps.push(renderSimpleStep('12', 'step_12'));

    // Step 13: UPO
    steps.push(`
        <div class="pb-step" data-step="13">
            <div class="pb-step-head"><div class="pb-step-num">13</div><h2>${t('step_13_title')}</h2></div>
            <div class="desc">${t('step_13_desc')}</div>
            <div class="warning"><i class="ph ph-warning"></i><span>${t('step_13_warn')}</span></div>
        </div>`);

    document.getElementById('pb-steps').innerHTML = steps.join('');

    // Register click for copy buttons & checklist
    document.querySelectorAll('.pb-copy-btn[data-val]').forEach(btn => {
        btn.addEventListener('click', async () => {
            await navigator.clipboard.writeText(btn.dataset.val);
            const orig = btn.innerHTML;
            btn.innerHTML = `<i class="ph ph-check"></i> ${t('copied')}`;
            btn.classList.add('copied');
            setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 1500);
        });
    });

    document.querySelectorAll('.checklist-item input').forEach(cb => {
        cb.addEventListener('change', updateProgress);
    });
    updateProgress();

    // QR code
    const qrUrl = encodeURIComponent(location.href);
    document.getElementById('qr-code').innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrUrl}" alt="QR">`;

    // Support button
    const helpBtn = document.getElementById('pb-support-btn');
    helpBtn.classList.remove('hidden');
    const waMsg = encodeURIComponent('Hi, I need help with MOS 2.0 application. My playbook: ' + location.href);
    helpBtn.href = `https://wa.me/48576816321?text=${waMsg}`;
    helpBtn.querySelector('span').textContent = t('help_whatsapp');
}

function renderSimpleStep(num, key) {
    return `
        <div class="pb-step" data-step="${num}">
            <div class="pb-step-head"><div class="pb-step-num">${num}</div><h2>${t(key + '_title')}</h2></div>
            <div class="desc">${t(key + '_desc')}</div>
        </div>`;
}

function renderCheckStep(num, key) {
    const items = (PB_STRINGS[intakeI18n.getCurrentLanguage()]?.[key + '_items']) || PB_STRINGS.en[key + '_items'] || [];
    const list = items.map((item, i) => `
        <label class="checklist-item">
            <input type="checkbox" data-step="${num}" data-item="${i}">
            <span>${escapeHtml(item)}</span>
        </label>`).join('');
    return `
        <div class="pb-step" data-step="${num}">
            <div class="pb-step-head"><div class="pb-step-num">${num}</div><h2>${t(key + '_title')}</h2></div>
            <div class="desc">${t(key + '_desc')}</div>
            <div style="margin-top: 8px">${list}</div>
        </div>`;
}

function renderCopyStep(num, key, fields) {
    const rows = fields.filter(f => f.val).map(f => `
        <div class="pb-copy-row">
            <span class="lbl">${escapeHtml(f.label)}</span>
            <span class="val">${escapeHtml(String(f.val))}</span>
            <button class="pb-copy-btn" data-val="${escapeHtml(String(f.val))}"><i class="ph ph-copy"></i> ${t('copy')}</button>
        </div>`).join('');
    return `
        <div class="pb-step" data-step="${num}">
            <div class="pb-step-head"><div class="pb-step-num">${num}</div><h2>${t(key + '_title')}</h2></div>
            <div class="desc">${t(key + '_desc')}</div>
            <div style="margin-top: 8px">${rows || '<div class="text-zinc-500 text-sm">—</div>'}</div>
        </div>`;
}

function renderDocsStep(num) {
    const rows = docs.map(d => {
        const labelMap = { passport: 'Paszport', contract: 'Umowa', payslips: 'Paski wypłat', zus: 'ZUS', photo_bio: 'Zdjęcie biom.', registration: 'Zameldowanie', birth_cert: 'Akt urodzenia', other: 'Inne' };
        return `
            <div class="pb-doc">
                <div class="doc-ic"><i class="ph ph-file"></i></div>
                <div class="doc-body">
                    <div class="doc-title">${labelMap[d.doc_type] || d.doc_type}</div>
                    <div class="doc-sub">${escapeHtml(d.file_name || '')} · ${Math.round((d.file_size || 0) / 1024)} KB</div>
                </div>
                <button class="pb-copy-btn" onclick="downloadDoc('${d.storage_path}', '${escapeHtml(d.file_name || 'doc')}')"><i class="ph ph-download"></i> ${t('download')}</button>
            </div>`;
    }).join('');
    return `
        <div class="pb-step" data-step="${num}">
            <div class="pb-step-head"><div class="pb-step-num">${num}</div><h2>${t('step_10_title')}</h2></div>
            <div class="desc">${t('step_10_desc')}</div>
            <div style="margin-top: 8px">${rows || '<div class="text-zinc-500 text-sm">—</div>'}</div>
        </div>`;
}

window.downloadDoc = async function(path, name) {
    const { data } = await db.storage.from('intake-docs').createSignedUrl(path, 3600);
    if (data) {
        const a = document.createElement('a');
        a.href = data.signedUrl;
        a.download = name;
        a.target = '_blank';
        a.click();
    }
};

window.markStepDone = function(num) {
    document.querySelector(`.pb-step[data-step="${num}"]`)?.classList.add('done');
    updateProgress();
};

function updateProgress() {
    const total = document.querySelectorAll('.pb-step').length;
    let done = 0;

    // Count steps with all checklist items ticked
    document.querySelectorAll('.pb-step').forEach(step => {
        const checks = step.querySelectorAll('.checklist-item input');
        if (checks.length) {
            const allChecked = Array.from(checks).every(c => c.checked);
            if (allChecked) { step.classList.add('done'); done++; }
            else step.classList.remove('done');
        } else if (step.classList.contains('done')) {
            done++;
        }
    });

    document.getElementById('pb-progress').style.width = (done / total * 100) + '%';
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }

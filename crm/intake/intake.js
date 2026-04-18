// Client intake — core logic (light theme, micro-steps)
// Token-based anonymous access, auto-save, camera-native upload, OCR, KRS/GUS lookups

const SUPABASE_URL = 'https://gfwsdrbywgmceateubyq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd3NkcmJ5d2dtY2VhdGV1YnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0Mzg1MjksImV4cCI6MjA5MjAxNDUyOX0.Qnn4MbtfApJ8sVwkpXNqNoHCBcGymS2U04kRLIVRta0';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Nowa struktura: 15 mikro-ekranów (0..16)
// 0=welcome, 1=name, 2=birth/nationality, 3=passport upload, 4=passport details,
// 5=contact, 6=whatsapp, 7=address-zip, 8=address-street,
// 9=employment-yn, 10=employer, 11=salary, 12=history, 13=purpose, 14=documents,
// 15=review, 16=success
const TOTAL_STEPS = 17;

const DOC_TYPES = [
    { key: 'passport',     required: true,  icon: 'ph-identification-card' },
    { key: 'photo_bio',    required: true,  icon: 'ph-user-square' },
    { key: 'contract',     required: false, icon: 'ph-file-text' },
    { key: 'payslips',     required: false, icon: 'ph-receipt', multi: true },
    { key: 'zus',          required: false, icon: 'ph-bank' },
    { key: 'registration', required: false, icon: 'ph-house' },
    { key: 'birth_cert',   required: false, icon: 'ph-scroll' },
];

// Conditional skip logic — ekrany do pominięcia na podstawie danych
function shouldSkipStep(step) {
    if ((step === 10 || step === 11) && formData.has_job === 'no') return true;
    return false;
}

// Rysowanie progress bar: które ekrany liczą się jako segmenty
const SEGMENT_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

const PHONE_CODES = {
    PL: '+48', UA: '+380', BY: '+375', RU: '+7', IN: '+91', NP: '+977',
    BD: '+880', PK: '+92', VN: '+84', PH: '+63', TR: '+90', GE: '+995',
    AM: '+374', AZ: '+994', KZ: '+7', UZ: '+998', MD: '+373', CN: '+86',
    EG: '+20', NG: '+234', US: '+1', GB: '+44', DE: '+49', IT: '+39',
};

let intake = null;
let formData = {};
let uploadedDocs = [];
let currentStep = 0;
let milestonesShown = new Set();
let countryPickerTarget = null; // 'nationality' | 'passport_issuing' | 'phone_country'
let pendingCaptureDocType = null;
let pendingCaptureBlob = null;
let pendingCaptureRotation = 0;

// === INIT ===
(async function init() {
    const token = new URLSearchParams(location.search).get('t') || new URLSearchParams(location.search).get('token');
    if (!token) return showExpired('Missing token');

    const { data, error } = await db.from('gmp_intake_tokens').select('*').eq('token', token).maybeSingle();
    if (error || !data) return showExpired('Token not found');

    if (new Date(data.expires_at) < new Date()) return showExpired('Token expired');

    intake = data;

    if (data.status === 'submitted' || data.status === 'approved') {
        showApp();
        applyI18n();
        buildProgressSegments();
        goToStep(16);
        return;
    }

    formData = data.data || {};
    if (data.language && intakeI18n.SUPPORTED.includes(data.language)) {
        intakeI18n.setLanguage(data.language);
    }

    // Load existing docs
    const { data: docs } = await db.from('gmp_intake_documents').select('*').eq('intake_id', intake.id);
    uploadedDocs = docs || [];

    showApp();
    applyI18n();
    renderLangPicker();
    buildProgressSegments();
    setupFields();
    setupNav();
    setupConditionalFields();
    setupSmartInputs();
    setupKeyboardNav();
    setupSwipeNav();
    initCountryPickers();
    restorePassportZone();

    // Resume at saved step
    const resumeStep = Math.min(data.current_step || 0, 15);
    goToStep(resumeStep, true);
})();

// Restore passport zone state if already uploaded (after resume)
async function restorePassportZone() {
    const passport = uploadedDocs.find(d => d.doc_type === 'passport');
    if (!passport) return;
    const zone = document.getElementById('passport-zone');
    if (!zone) return;
    zone.classList.add('uploaded');
    zone.querySelector('.cap-title').textContent = intakeI18n.t('documents.uploaded') || '✓ Uploaded';
    zone.querySelector('.cap-hint').textContent = passport.file_name || 'passport.jpg';
    const { data: signed } = await db.storage.from('intake-docs').createSignedUrl(passport.storage_path, 3600);
    const preview = document.getElementById('passport-preview');
    if (signed && preview) {
        const sizeKb = passport.file_size ? Math.round(passport.file_size / 1024) + ' KB' : '';
        preview.innerHTML = `<div class="uploaded-preview">
            <img src="${signed.signedUrl}" alt="Passport">
            <div class="up-body">
                <div class="up-title">✓ ${intakeI18n.t('documents.uploaded') || 'Uploaded'}</div>
                <div class="up-sub">${escapeHtml(passport.file_name || '')}${sizeKb ? ' · ' + sizeKb : ''}</div>
            </div>
            <button class="up-remove" onclick="removePassport('${passport.id}', '${passport.storage_path}')">${intakeI18n.t('common.remove') || 'Remove'}</button>
        </div>`;
    }
}

function showExpired(reason) {
    console.warn('intake expired:', reason);
    document.getElementById('state-loading').classList.add('hidden');
    document.getElementById('state-expired').classList.remove('hidden');
    applyI18n();
}

function showApp() {
    document.getElementById('state-loading').classList.add('hidden');
    document.getElementById('state-app').classList.remove('hidden');
}

// === I18N ===
function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = intakeI18n.t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = intakeI18n.t(el.dataset.i18nPlaceholder);
    });
    const lf = document.getElementById('lang-flag');
    const lc = document.getElementById('lang-code');
    if (lf) lf.textContent = intakeI18n.LANG_FLAGS[intakeI18n.getCurrentLanguage()];
    if (lc) lc.textContent = intakeI18n.getCurrentLanguage().toUpperCase();
    document.title = intakeI18n.t('meta.title');
    updateCountryPickerDisplays();
}

function renderLangPicker() {
    const el = document.getElementById('lang-options');
    el.innerHTML = intakeI18n.getSupportedLanguages().map(l => `
        <div class="lang-option ${l.code === intakeI18n.getCurrentLanguage() ? 'active' : ''}" onclick="pickLang('${l.code}')">
            <span class="flag">${l.flag}</span>
            <span>${l.name}</span>
        </div>
    `).join('');
    document.getElementById('lang-btn').addEventListener('click', () => openSheet('lang-sheet'));
    document.getElementById('lang-sheet').addEventListener('click', (e) => {
        if (e.target.id === 'lang-sheet') closeLangSheet();
    });
}

window.pickLang = async function(code) {
    intakeI18n.setLanguage(code);
    closeLangSheet();
    applyI18n();
    renderLangPicker();
    renderDocs();
    updateProgress();
    if (currentStep === 15) renderReview();
    if (intake) {
        await db.from('gmp_intake_tokens').update({ language: code }).eq('id', intake.id);
    }
};
window.closeLangSheet = () => closeSheet('lang-sheet');

function openSheet(id) {
    const el = document.getElementById(id);
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
}
function closeSheet(id) {
    const el = document.getElementById(id);
    el.classList.remove('open');
    document.body.style.overflow = '';
}

// === PROGRESS ===
function buildProgressSegments() {
    const wrap = document.getElementById('progress-segments');
    wrap.innerHTML = SEGMENT_STEPS.map(() => '<div class="progress-seg"></div>').join('');
}

function updateProgress() {
    const segs = document.querySelectorAll('.progress-seg');
    SEGMENT_STEPS.forEach((s, i) => {
        segs[i].classList.remove('done', 'active');
        if (s < currentStep) segs[i].classList.add('done');
        else if (s === currentStep) segs[i].classList.add('active');
    });

    const countEl = document.getElementById('step-count');
    const est = document.getElementById('step-est');
    if (currentStep === 0) {
        countEl.textContent = intakeI18n.t('common.lets_start') || 'Let\'s start';
        est.style.display = '';
    } else if (currentStep === 16) {
        countEl.textContent = intakeI18n.t('success.complete') || '✓ Complete';
        est.style.display = 'none';
    } else {
        const pos = SEGMENT_STEPS.indexOf(currentStep) + 1;
        countEl.textContent = `${pos} / ${SEGMENT_STEPS.length}`;
        const remaining = Math.max(1, Math.round(((SEGMENT_STEPS.length - pos) / SEGMENT_STEPS.length) * 15));
        est.textContent = `~${remaining} min`;
    }
}

// === STEP NAVIGATION ===
function goToStep(n, silent = false) {
    if (n < 0 || n >= TOTAL_STEPS) return;

    // Skip conditional steps
    while (shouldSkipStep(n)) {
        n = n > currentStep ? n + 1 : n - 1;
        if (n < 0 || n >= TOTAL_STEPS) return;
    }

    const prev = currentStep;
    currentStep = n;

    document.querySelectorAll('.step').forEach(s => {
        s.classList.remove('active', 'going-back');
    });
    const target = document.querySelector(`[data-step="${n}"]`);
    if (n < prev) target.classList.add('going-back');
    target.classList.add('active');

    // Bottom nav
    const back = document.getElementById('btn-back');
    const nextText = document.getElementById('btn-next-text');
    const nextBtn = document.getElementById('btn-next');
    const nextIco = document.getElementById('btn-next-ico');
    const nav = document.getElementById('step-nav');

    if (n === 0) {
        back.style.display = 'none';
        nextText.textContent = intakeI18n.t('welcome.start');
        nextIco.className = 'ph ph-caret-right';
        nav.style.display = '';
    } else if (n === 15) {
        back.style.display = '';
        nextText.textContent = intakeI18n.t('review.send') || 'Send to law firm';
        nextIco.className = 'ph ph-paper-plane-tilt';
        nav.style.display = '';
    } else if (n === 16) {
        nav.style.display = 'none';
        return;
    } else {
        back.style.display = '';
        // Jeśli edytujemy z review → button pokazuje "Back to review"
        if (returnToReview) {
            nextText.textContent = intakeI18n.t('review.back_to_review') || 'Back to review';
            nextIco.className = 'ph ph-arrow-u-up-left';
        } else {
            nextText.textContent = intakeI18n.t('common.next');
            nextIco.className = 'ph ph-caret-right';
        }
        nav.style.display = '';
    }

    // Step-specific
    if (n === 4) prefillPassportDetails();
    if (n === 11) checkSalaryWarning();
    if (n === 14) renderDocs();
    if (n === 15) renderReview();

    updateProgress();
    validateCurrentStep();

    // Save step progression (don't re-save if silent load)
    if (!silent && intake && intake.current_step !== n) {
        db.from('gmp_intake_tokens').update({ current_step: n }).eq('id', intake.id);
        intake.current_step = n;
    }

    // Milestones
    if (!silent) showMilestone(n);

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Auto-focus first input
    setTimeout(() => {
        const firstInput = target.querySelector('input[type=text],input[type=email],input[type=tel],input[type=number],input[type=date],textarea');
        if (firstInput && window.matchMedia('(min-width: 768px)').matches) firstInput.focus();
    }, 100);
}

function showMilestone(step) {
    const milestones = {
        5: { key: 'milestone.25', fallback: '🎉 Nice! First part done.' },
        9: { key: 'milestone.50', fallback: '🚀 Halfway there!' },
        14: { key: 'milestone.75', fallback: '✨ Almost done!' },
    };
    const m = milestones[step];
    if (!m || milestonesShown.has(step)) return;
    milestonesShown.add(step);
    const toast = document.getElementById('milestone-toast');
    toast.innerHTML = intakeI18n.t(m.key) || m.fallback;
    toast.classList.remove('show');
    void toast.offsetWidth;
    toast.classList.add('show');
}

// Track: ostatni step z którego przyszliśmy do "edit" (z review)
let returnToReview = false;

function setupNav() {
    document.getElementById('btn-next').addEventListener('click', async () => {
        if (currentStep === 15) {
            await submitIntake();
            return;
        }
        if (!validateCurrentStep({ showErrors: true })) {
            // Subtle shake on button
            const btn = document.getElementById('btn-next');
            btn.animate([
                { transform: 'translateX(0)' }, { transform: 'translateX(-4px)' },
                { transform: 'translateX(4px)' }, { transform: 'translateX(0)' },
            ], { duration: 200 });
            return;
        }
        // Jeśli weszliśmy z review przez "Edit", wracamy tam
        if (returnToReview) {
            returnToReview = false;
            goToStep(15);
            return;
        }
        let next = currentStep + 1;
        goToStep(next);
    });
    document.getElementById('btn-back').addEventListener('click', () => {
        returnToReview = false;
        goToStep(Math.max(0, currentStep - 1));
    });
}

function setupKeyboardNav() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.sheet-backdrop.open').forEach(el => el.classList.remove('open'));
            document.body.style.overflow = '';
        }
        // Enter = next (unless textarea)
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
            const next = document.getElementById('btn-next');
            if (next && !next.disabled) {
                e.preventDefault();
                next.click();
            }
        }
    });
}

function setupSwipeNav() {
    let touchStart = null;
    let touchStartTime = 0;
    const threshold = 60;
    const maxTime = 500;
    document.addEventListener('touchstart', (e) => {
        if (e.target.closest('.sheet-backdrop, .preview-modal, input, textarea, select, .radio-card, .yn-card, .pill-radio, button')) return;
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        touchStartTime = Date.now();
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
        if (!touchStart) return;
        const dt = Date.now() - touchStartTime;
        if (dt > maxTime) { touchStart = null; return; }
        const touchEnd = e.changedTouches[0];
        const dx = touchEnd.clientX - touchStart.x;
        const dy = Math.abs(touchEnd.clientY - touchStart.y);
        if (Math.abs(dx) < threshold || dy > 50) { touchStart = null; return; }
        if (dx < 0) {
            // Swipe left = next
            const next = document.getElementById('btn-next');
            if (next && !next.disabled && currentStep > 0 && currentStep < 15) next.click();
        } else {
            // Swipe right = back
            if (currentStep > 0 && currentStep < 16) goToStep(currentStep - 1);
        }
        touchStart = null;
    }, { passive: true });
}

// === FIELDS / AUTO-SAVE ===
function setupFields() {
    document.querySelectorAll('[data-field]').forEach(el => {
        const key = el.dataset.field;
        const val = formData[key];
        if (val === undefined || val === null) return;
        if (el.type === 'radio') {
            if (el.value === String(val)) el.checked = true;
        } else if (el.type === 'checkbox') {
            el.checked = !!val;
        } else {
            el.value = val;
        }
    });

    let saveTimer;
    const saveDebounced = () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveData, 500);
    };

    document.querySelectorAll('[data-field]').forEach(el => {
        const collect = () => {
            const key = el.dataset.field;
            if (el.type === 'radio') {
                const checked = document.querySelector(`[data-field="${key}"]:checked`);
                formData[key] = checked ? checked.value : null;
            } else if (el.type === 'checkbox') {
                formData[key] = el.checked;
            } else if (el.type === 'hidden') {
                formData[key] = el.value;
            } else {
                formData[key] = el.value;
            }
            validateCurrentStep();
            handleFieldChange(key);
        };
        const ev = (el.type === 'radio' || el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
        el.addEventListener(ev, () => { collect(); saveDebounced(); });
    });
}

async function saveData() {
    if (!intake) return;
    const { error } = await db.from('gmp_intake_tokens').update({ data: formData }).eq('id', intake.id);
    if (!error) {
        const toast = document.getElementById('auto-save');
        toast.classList.remove('show');
        void toast.offsetWidth;
        toast.classList.add('show');
    }
}

// Auto-advance on single-select Y/N and radio-cards
function handleFieldChange(key) {
    if (key === 'has_job' || key === 'had_refusal') {
        if (key === 'had_refusal') {
            document.getElementById('refusal-details-field').style.display = formData.had_refusal === 'yes' ? '' : 'none';
        }
    }
    // Salary warning check on salary_gross change
    if (key === 'salary_gross') checkSalaryWarning();
}

function setupConditionalFields() {
    document.querySelectorAll('[data-field="had_refusal"]').forEach(r => r.addEventListener('change', () => {
        document.getElementById('refusal-details-field').style.display = formData.had_refusal === 'yes' ? '' : 'none';
    }));
    if (formData.had_refusal === 'yes') document.getElementById('refusal-details-field').style.display = '';
}

function checkSalaryWarning() {
    const s = parseFloat(formData.salary_gross);
    const warn = document.getElementById('salary-warn');
    if (!warn) return;
    warn.style.display = (s > 0 && s < 4666) ? '' : 'none';
}

// === COUNTRY PICKERS ===
function initCountryPickers() {
    // Sheet search
    const searchInput = document.getElementById('country-search');
    searchInput.addEventListener('input', () => {
        renderCountryRows(searchInput.value);
    });
    document.getElementById('country-sheet').addEventListener('click', (e) => {
        if (e.target.id === 'country-sheet') closeCountrySheet();
    });
    updateCountryPickerDisplays();
}

function updateCountryPickerDisplays() {
    const lang = intakeI18n.getCurrentLanguage();
    // Nationality
    updateCountryBtn('nationality', formData.nationality, lang);
    updateCountryBtn('passport_issuing', formData.passport_issuing, lang);
    // Phone country
    const pc = formData.phone_country || 'PL';
    const country = window.COUNTRIES.find(c => c.c === pc);
    if (country) {
        document.getElementById('phone-prefix-flag').textContent = country.f;
        document.getElementById('phone-prefix-code').textContent = PHONE_CODES[pc] || '+';
    }
}

function updateCountryBtn(target, code, lang) {
    const btn = document.getElementById('pick-' + target);
    if (!btn) return;
    if (code) {
        const country = window.COUNTRIES.find(c => c.c === code);
        if (country) {
            btn.classList.remove('placeholder');
            btn.querySelector('.flag').textContent = country.f;
            btn.querySelector('.cname').textContent = window.getCountryName(code, lang);
        }
    } else {
        btn.classList.add('placeholder');
        btn.querySelector('.flag').textContent = '🌐';
        btn.querySelector('.cname').textContent = intakeI18n.t('q.picker.choose') || 'Tap to choose';
    }
}

window.openCountrySheet = function(target) {
    countryPickerTarget = target;
    document.getElementById('country-search').value = '';
    renderCountryRows('');
    document.getElementById('country-sheet-title').textContent =
        target === 'phone_country' ? (intakeI18n.t('q.picker.title_phone') || 'Choose country code') :
        target === 'passport_issuing' ? (intakeI18n.t('q.picker.title_passport') || 'Passport issued by') :
        (intakeI18n.t('q.picker.title_nationality') || 'Your nationality');
    openSheet('country-sheet');
    setTimeout(() => document.getElementById('country-search').focus(), 300);
};

window.closeCountrySheet = function() {
    closeSheet('country-sheet');
};

function renderCountryRows(query) {
    const lang = intakeI18n.getCurrentLanguage();
    const results = window.searchCountries(query, lang);
    const selected =
        countryPickerTarget === 'phone_country' ? (formData.phone_country || 'PL') :
        formData[countryPickerTarget];
    const rows = results.map(c => {
        const label = window.getCountryName(c.c, lang);
        const suffix = countryPickerTarget === 'phone_country' && PHONE_CODES[c.c] ? ` <span style="color: var(--text-tertiary); margin-left: 8px">${PHONE_CODES[c.c]}</span>` : '';
        return `<div class="country-row ${c.c === selected ? 'active' : ''}" onclick="pickCountry('${c.c}')">
            <span class="flag">${c.f}</span>
            <span>${label}${suffix}</span>
        </div>`;
    }).join('');
    document.getElementById('country-rows').innerHTML = rows || `<div style="padding: 20px; text-align: center; color: var(--text-tertiary)">${intakeI18n.t('q.picker.none') || 'No results'}</div>`;
}

window.pickCountry = function(code) {
    formData[countryPickerTarget] = code;
    const hidden = document.querySelector(`[data-field="${countryPickerTarget}"]`);
    if (hidden) hidden.value = code;
    updateCountryPickerDisplays();
    saveData();
    validateCurrentStep();
    // Auto-fill passport_issuing = nationality if not set
    if (countryPickerTarget === 'nationality' && !formData.passport_issuing) {
        formData.passport_issuing = code;
        const ph = document.querySelector('[data-field="passport_issuing"]');
        if (ph) ph.value = code;
        updateCountryPickerDisplays();
    }
    closeCountrySheet();
};

// === SMART INPUTS ===
function setupSmartInputs() {
    // ZIP mask + lookup
    const zipEl = document.querySelector('[data-field="zip"]');
    if (zipEl) {
        zipEl.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '').slice(0, 5);
            if (v.length > 2) v = v.slice(0, 2) + '-' + v.slice(2);
            e.target.value = v;
            formData.zip = v;
            if (v.length === 6) debouncedZipLookup();
        });
    }

    // NIP mask + lookup
    const nipEl = document.querySelector('[data-field="employer_nip"]');
    if (nipEl) {
        nipEl.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '').slice(0, 10);
            // Format: XXX XXX XX XX
            if (v.length > 3 && v.length <= 6) v = v.slice(0, 3) + ' ' + v.slice(3);
            else if (v.length > 6 && v.length <= 8) v = v.slice(0, 3) + ' ' + v.slice(3, 6) + ' ' + v.slice(6);
            else if (v.length > 8) v = v.slice(0, 3) + ' ' + v.slice(3, 6) + ' ' + v.slice(6, 8) + ' ' + v.slice(8);
            e.target.value = v;
            const digits = v.replace(/\s/g, '');
            formData.employer_nip = digits;
            if (digits.length === 10) debouncedNipLookup();
        });
    }

    // Phone format
    const phoneEl = document.querySelector('.input-prefix input[data-field="phone"]');
    if (phoneEl) {
        phoneEl.addEventListener('input', (e) => {
            let v = e.target.value.replace(/[^\d+]/g, '');
            e.target.value = v;
            formData.phone = v;
        });
    }

    // Email validation visual
    const emailEl = document.querySelector('[data-field="email"]');
    if (emailEl) {
        emailEl.addEventListener('blur', () => {
            const field = emailEl.closest('.field');
            const v = emailEl.value.trim();
            field.classList.remove('has-error', 'is-ok');
            if (!v) return;
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
                field.classList.add('is-ok');
            } else {
                field.classList.add('has-error');
            }
        });
    }

    // Salary number formatting (on blur only — keep raw during input)
    const salaryEl = document.querySelector('.input-prefix input[data-field="salary_gross"]');
    if (salaryEl) {
        salaryEl.addEventListener('input', () => {
            checkSalaryWarning();
        });
    }
}

let zipTimer;
function debouncedZipLookup() {
    clearTimeout(zipTimer);
    zipTimer = setTimeout(lookupZipHandler, 400);
}

async function lookupZipHandler() {
    const zip = formData.zip;
    if (!/^\d{2}-\d{3}$/.test(zip)) return;
    try {
        const res = await fetch(`https://api.zippopotam.us/pl/${zip}`);
        if (!res.ok) return;
        const data = await res.json();
        const place = data?.places?.[0];
        if (place) {
            if (!formData.city) {
                const cityEl = document.querySelector('[data-field="city"]');
                if (cityEl) {
                    cityEl.value = place['place name'];
                    cityEl.closest('.field').classList.add('is-ok');
                    cityEl.classList.add('pulse-ok');
                    formData.city = place['place name'];
                    saveData();
                }
            }
            // Voivodeship mapping (GUS returns Polish names)
            const voivMap = {
                'Dolnośląskie': 'dolnoslaskie', 'Kujawsko-Pomorskie': 'kujawsko-pomorskie',
                'Lubelskie': 'lubelskie', 'Lubuskie': 'lubuskie', 'Łódzkie': 'lodzkie',
                'Małopolskie': 'malopolskie', 'Mazowieckie': 'mazowieckie', 'Opolskie': 'opolskie',
                'Podkarpackie': 'podkarpackie', 'Podlaskie': 'podlaskie', 'Pomorskie': 'pomorskie',
                'Śląskie': 'slaskie', 'Świętokrzyskie': 'swietokrzyskie',
                'Warmińsko-Mazurskie': 'warminsko-mazurskie', 'Wielkopolskie': 'wielkopolskie',
                'Zachodniopomorskie': 'zachodniopomorskie',
            };
            const voivKey = voivMap[place.state];
            if (voivKey) {
                const voivEl = document.querySelector('[data-field="voivodeship"]');
                if (voivEl) {
                    voivEl.value = voivKey;
                    formData.voivodeship = voivKey;
                    saveData();
                }
            }
        }
    } catch (e) { /* silent */ }
}

let nipTimer;
function debouncedNipLookup() {
    clearTimeout(nipTimer);
    nipTimer = setTimeout(lookupNipHandler, 400);
}

async function lookupNipHandler() {
    const nip = (formData.employer_nip || '').replace(/\D/g, '');
    if (nip.length !== 10) return;
    try {
        const today = new Date().toISOString().slice(0, 10);
        const res = await fetch(`https://wl-api.mf.gov.pl/api/search/nip/${nip}?date=${today}`);
        if (!res.ok) return;
        const data = await res.json();
        const subject = data?.result?.subject;
        if (subject?.name) {
            const nameEl = document.querySelector('[data-field="employer_name"]');
            if (nameEl && !nameEl.value) {
                nameEl.value = subject.name;
                formData.employer_name = subject.name;
                nameEl.closest('.field').classList.add('is-ok');
                nameEl.classList.add('pulse-ok');
                saveData();
            }
            const nipField = document.querySelector('[data-field="employer_nip"]').closest('.field');
            nipField.classList.add('is-ok');
        }
    } catch (e) { /* silent */ }
}

// Quick-pick arrival date
window.setArrivalDate = function(daysBack) {
    const d = new Date();
    d.setDate(d.getDate() - daysBack);
    const el = document.querySelector('[data-field="arrival_date"]');
    el.value = d.toISOString().slice(0, 10);
    formData.arrival_date = el.value;
    validateCurrentStep();
    saveData();
    // Highlight visual na wybranym quick-pick
    const step = document.querySelector('[data-step="12"]');
    if (step) {
        step.querySelectorAll('.quick-pick').forEach(qp => {
            qp.style.background = '';
            qp.style.color = '';
            qp.style.borderColor = '';
        });
        const btn = [...step.querySelectorAll('.quick-pick')].find(b => b.getAttribute('onclick')?.includes(`(${daysBack})`));
        if (btn) {
            btn.style.background = 'var(--bg-accent)';
            btn.style.color = 'var(--accent-text)';
            btn.style.borderColor = 'var(--border-accent)';
        }
    }
};

// === VALIDATION ===
const REQUIRED_PER_STEP = {
    0: [],
    1: ['first_name', 'last_name'],
    2: ['birth_date', 'nationality'],
    3: [], // passport upload optional — user can skip
    4: ['passport_number', 'passport_expiry'],
    5: ['phone', 'email'],
    6: [],
    7: ['zip', 'city'],
    8: [],
    9: ['has_job'],
    10: ['employer_nip'],
    11: ['salary_gross'],
    12: ['arrival_date'],
    13: ['purpose'],
    14: [],
    15: ['agree_processing'],
};

function validateCurrentStep(opts = {}) {
    const required = REQUIRED_PER_STEP[currentStep] || [];
    const errors = [];
    required.forEach(k => {
        const v = formData[k];
        if (v === undefined || v === null || v === '' || v === false) errors.push(k);
    });
    // Special: email format
    if (currentStep === 5 && formData.email) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.push('email');
    }

    // Clear old errors
    const activeStep = document.querySelector(`[data-step="${currentStep}"]`);
    if (activeStep) {
        activeStep.querySelectorAll('.field.has-error').forEach(f => f.classList.remove('has-error'));
    }

    // Show errors on fields (only when user tries to proceed)
    if (opts.showErrors && errors.length > 0 && activeStep) {
        errors.forEach(k => {
            const el = activeStep.querySelector(`[data-field="${k}"]`);
            if (el) {
                const field = el.closest('.field') || el.closest('.input-prefix')?.closest('.field');
                if (field) field.classList.add('has-error');
            }
            // Special for nationality/passport_issuing (country pickers)
            const btn = activeStep.querySelector(`#pick-${k}`);
            if (btn) {
                btn.style.borderColor = 'var(--danger)';
                setTimeout(() => btn.style.borderColor = '', 2500);
            }
        });
    }

    const nextBtn = document.getElementById('btn-next');
    nextBtn.disabled = errors.length > 0;
    return errors.length === 0;
}

// === DOCUMENT UPLOAD (with camera + compression) ===
window.triggerCapture = function(docType, mode) {
    pendingCaptureDocType = docType;
    const input = mode === 'camera'
        ? document.getElementById(docType === 'passport' ? 'passport-file-camera' : 'doc-file-camera')
        : document.getElementById(docType === 'passport' ? 'passport-file' : 'doc-file');
    if (!input) return;
    input.value = '';
    input.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await handleFileSelected(docType, file);
    };
    // Default: prefer camera on mobile
    if (!mode) {
        const isMobile = /iPhone|Android|iPad|iPod/i.test(navigator.userAgent);
        const preferInput = isMobile
            ? document.getElementById(docType === 'passport' ? 'passport-file-camera' : 'doc-file-camera')
            : document.getElementById(docType === 'passport' ? 'passport-file' : 'doc-file');
        preferInput.click();
        return;
    }
    input.click();
};

async function handleFileSelected(docType, file) {
    if (file.size > 20 * 1024 * 1024) {
        alert(intakeI18n.t('documents.file_too_large') || 'File too large (max 20MB)');
        return;
    }

    // For images: compress and show preview modal
    if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file, 2000, 0.85);
        pendingCaptureBlob = compressed;
        pendingCaptureRotation = 0;
        showPreview(compressed);
    } else {
        // PDF - upload directly
        await uploadFile(docType, file);
    }
}

function compressImage(file, maxDim, quality) {
    return new Promise((resolve) => {
        const img = new Image();
        const reader = new FileReader();
        // Fallback: jeśli HEIC/coś nieobsługiwanego — wrzucamy plik as-is
        const fallback = () => resolve(file);
        reader.onerror = fallback;
        img.onerror = fallback;
        reader.onload = (e) => {
            img.onload = () => {
                try {
                    let w = img.width, h = img.height;
                    if (!w || !h) return fallback();
                    if (w > maxDim || h > maxDim) {
                        if (w > h) { h = Math.round(h * (maxDim / w)); w = maxDim; }
                        else { w = Math.round(w * (maxDim / h)); h = maxDim; }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w; canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    canvas.toBlob(blob => {
                        if (!blob) return fallback();
                        resolve(new File([blob], file.name.replace(/\.(heic|heif|png)$/i, '.jpg'), { type: 'image/jpeg' }));
                    }, 'image/jpeg', quality);
                } catch (err) { fallback(); }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function showPreview(blob) {
    const img = document.getElementById('preview-img');
    if (img.src && img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
    img.src = URL.createObjectURL(blob);
    img.style.transform = `rotate(${pendingCaptureRotation}deg)`;
    document.getElementById('preview-modal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

window.closePreview = function() {
    document.getElementById('preview-modal').classList.remove('open');
    const img = document.getElementById('preview-img');
    if (img.src && img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
    pendingCaptureBlob = null;
    document.body.style.overflow = '';
};

window.rotatePreview = function() {
    pendingCaptureRotation = (pendingCaptureRotation + 90) % 360;
    document.getElementById('preview-img').style.transform = `rotate(${pendingCaptureRotation}deg)`;
};

window.retakePreview = function() {
    closePreview();
    triggerCapture(pendingCaptureDocType, 'camera');
};

window.usePreview = async function() {
    if (!pendingCaptureBlob) return;
    let finalBlob = pendingCaptureBlob;
    if (pendingCaptureRotation !== 0) {
        finalBlob = await rotateImage(pendingCaptureBlob, pendingCaptureRotation);
    }
    closePreview();
    await uploadFile(pendingCaptureDocType, finalBlob);
};

function rotateImage(blob, degrees) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const rad = degrees * Math.PI / 180;
            if (degrees === 90 || degrees === 270) {
                canvas.width = img.height;
                canvas.height = img.width;
            } else {
                canvas.width = img.width;
                canvas.height = img.height;
            }
            const ctx = canvas.getContext('2d');
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(rad);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            canvas.toBlob(b => resolve(new File([b], blob.name, { type: 'image/jpeg' })), 'image/jpeg', 0.85);
        };
        img.src = URL.createObjectURL(blob);
    });
}

async function uploadFile(docType, file) {
    const statusEl = document.getElementById(`${docType}-status`);
    const setStatus = (html) => { if (statusEl) statusEl.innerHTML = html; };

    setStatus(`<div class="ocr-status loading">
        <div class="spinner-sm"></div>
        <span>${intakeI18n.t('documents.uploading') || 'Uploading…'}</span>
    </div>`);

    const ext = (file.name || 'photo').split('.').pop();
    const path = `${intake.token}/${docType}_${Date.now()}.${ext}`;

    const { error: upErr } = await db.storage.from('intake-docs').upload(path, file, { contentType: file.type });
    if (upErr) {
        setStatus(`<div class="ocr-status warn"><i class="ph ph-warning-circle"></i> ${upErr.message}</div>`);
        return;
    }

    const { data: doc, error: insErr } = await db.from('gmp_intake_documents').insert({
        intake_id: intake.id,
        doc_type: docType,
        storage_path: path,
        file_name: file.name || `${docType}.jpg`,
        file_size: file.size,
        mime_type: file.type,
    }).select().single();

    if (insErr) {
        setStatus(`<div class="ocr-status warn"><i class="ph ph-warning-circle"></i> ${insErr.message}</div>`);
        return;
    }

    uploadedDocs.push(doc);

    // Show preview for passport
    if (docType === 'passport') {
        const zone = document.getElementById('passport-zone');
        zone.classList.add('uploaded');
        zone.querySelector('.cap-title').textContent = intakeI18n.t('documents.uploaded') || '✓ Uploaded';
        zone.querySelector('.cap-hint').textContent = file.name || 'passport.jpg';

        const { data: signed } = await db.storage.from('intake-docs').createSignedUrl(path, 3600);
        const preview = document.getElementById('passport-preview');
        if (signed && preview) {
            preview.innerHTML = `<div class="uploaded-preview">
                <img src="${signed.signedUrl}" alt="Passport">
                <div class="up-body">
                    <div class="up-title">✓ ${intakeI18n.t('documents.uploaded') || 'Uploaded'}</div>
                    <div class="up-sub">${file.name || ''} · ${Math.round(file.size / 1024)} KB</div>
                </div>
                <button class="up-remove" onclick="removePassport('${doc.id}', '${path}')">${intakeI18n.t('common.remove') || 'Remove'}</button>
            </div>`;
        }
    }

    renderDocs();
    validateCurrentStep();

    // OCR for passport
    if (docType === 'passport') {
        setStatus(`<div class="ocr-status loading">
            <div class="spinner-sm"></div>
            <span>${intakeI18n.t('documents.validating') || 'Reading your passport…'}</span>
        </div>`);
        const result = await ocrDocument(docType, path, doc.id);
        if (result?.extracted) {
            applyOcrExtracted(result.extracted);
            const issues = result.validation?.issues || [];
            if (issues.length) {
                setStatus(`<div class="ocr-status warn">
                    <i class="ph ph-warning-circle"></i>
                    <span>${intakeI18n.t('documents.ocr_warnings') || 'Uploaded — please double-check:'} ${issues.join(', ')}</span>
                </div>`);
            } else {
                setStatus(`<div class="ocr-status success">
                    <i class="ph ph-sparkle"></i>
                    <span>${intakeI18n.t('documents.ocr_ok') || 'Fields filled automatically'}</span>
                </div>`);
            }
        } else {
            setStatus(`<div class="ocr-status success">
                <i class="ph ph-check-circle"></i>
                <span>${intakeI18n.t('documents.uploaded') || 'Uploaded'}</span>
            </div>`);
        }
    } else {
        setStatus('');
    }
}

window.removePassport = async function(docId, path) {
    await db.storage.from('intake-docs').remove([path]);
    await db.from('gmp_intake_documents').delete().eq('id', docId);
    uploadedDocs = uploadedDocs.filter(d => d.id !== docId);
    document.getElementById('passport-preview').innerHTML = '';
    document.getElementById('passport-status').innerHTML = '';
    const zone = document.getElementById('passport-zone');
    zone.classList.remove('uploaded');
    zone.querySelector('.cap-title').textContent = intakeI18n.t('common.upload_photo') || 'Take a photo';
    zone.querySelector('.cap-hint').textContent = intakeI18n.t('q.passport_upload.hint') || 'Or choose file';
    renderDocs();
};

window.skipUpload = function(docType) {
    goToStep(currentStep + 1);
};

async function ocrDocument(docType, storagePath, docId) {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);
        const res = await fetch(`${SUPABASE_URL}/functions/v1/intake-ocr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
            body: JSON.stringify({ intake_token: intake.token, doc_type: docType, storage_path: storagePath, doc_id: docId }),
            signal: controller.signal,
        });
        clearTimeout(timer);
        if (!res.ok) return null;
        const data = await res.json();
        if (data?.error) return null;
        return data;
    } catch (e) { console.warn('OCR skipped', e.message); return null; }
}

function applyOcrExtracted(extracted) {
    if (!extracted || typeof extracted !== 'object') return;
    const fields = ['first_name', 'last_name', 'birth_date', 'gender', 'nationality',
                    'passport_number', 'passport_expiry', 'passport_issuing'];
    fields.forEach(key => {
        if (extracted[key] != null && extracted[key] !== '') {
            formData[key] = extracted[key];
            const el = document.querySelector(`[data-field="${key}"]`);
            if (el) {
                if (el.type === 'radio') {
                    const match = document.querySelector(`[data-field="${key}"][value="${extracted[key]}"]`);
                    if (match) match.checked = true;
                } else {
                    el.value = extracted[key];
                }
            }
            document.querySelectorAll(`[name="${key}"]`).forEach(r => {
                r.checked = r.value === String(extracted[key]);
            });
        }
    });
    // Nationality + passport issuing → if we got country code/name, try match
    ['nationality', 'passport_issuing'].forEach(key => {
        if (extracted[key]) {
            const code = matchCountryCode(extracted[key]);
            if (code) formData[key] = code;
        }
    });
    updateCountryPickerDisplays();
    saveData();
}

function matchCountryCode(input) {
    if (!input) return null;
    const v = String(input).trim().toUpperCase();
    // Direct ISO match
    if (window.COUNTRIES.find(c => c.c === v)) return v;
    // ISO 3-letter fallback (PK, IND etc.) or name
    const lower = input.toLowerCase();
    const match = window.COUNTRIES.find(c =>
        c.n.toLowerCase() === lower ||
        (c.loc && Object.values(c.loc).some(l => l.toLowerCase() === lower))
    );
    return match ? match.c : null;
}

function prefillPassportDetails() {
    // Visual cue: if OCR filled values, show them highlighted
    ['passport_number', 'passport_expiry'].forEach(k => {
        const el = document.querySelector(`[data-field="${k}"]`);
        if (el && formData[k]) {
            el.value = formData[k];
        }
    });
    updateCountryPickerDisplays();
    // Adaptive lead: zmieniamy komunikat wg stanu
    const leadEl = document.getElementById('passport-details-lead');
    if (leadEl) {
        const hasOcrFill = formData.passport_number || formData.passport_expiry;
        if (hasOcrFill) {
            leadEl.textContent = intakeI18n.t('q.passport_details.lead_ocr') || intakeI18n.t('q.passport_details.lead') || 'Check the values — correct if needed.';
        } else {
            leadEl.textContent = intakeI18n.t('q.passport_details.lead_manual') || 'Enter the values from your passport.';
        }
    }
}

// === DOCS LIST (step 14) ===
function renderDocs() {
    const el = document.getElementById('docs-list');
    if (!el) return;
    const lang = intakeI18n.getCurrentLanguage();
    const docsHtml = DOC_TYPES.map(dt => {
        const uploads = uploadedDocs.filter(d => d.doc_type === dt.key);
        const hasAny = uploads.length > 0;
        const title = intakeI18n.t('documents.' + dt.key) || dt.key;
        const desc = hasAny
            ? `✓ ${uploads.length} ${uploads.length === 1 ? intakeI18n.t('documents.file') || 'file' : intakeI18n.t('documents.files') || 'files'}`
            : (intakeI18n.t('documents.' + dt.key + '_desc') || '');
        const actionLabel = hasAny
            ? (intakeI18n.t('common.change') || 'Change')
            : (intakeI18n.t('documents.upload_action') || 'Upload');
        return `<div class="doc-card ${hasAny ? 'uploaded' : ''}">
            <div class="doc-ico"><i class="ph ${dt.icon}"></i></div>
            <div class="doc-body">
                <div class="doc-title">${title}${dt.required && !hasAny ? ' <span class="doc-req">' + (intakeI18n.t('documents.required') || 'Required') + '</span>' : ''}</div>
                <div class="doc-sub">${desc}</div>
            </div>
            <button class="doc-action" onclick="pickDocFile('${dt.key}')">${actionLabel}</button>
        </div>`;
    }).join('');
    el.innerHTML = docsHtml;

    const hint = document.getElementById('docs-progress-hint');
    if (hint) {
        const done = DOC_TYPES.filter(dt => uploadedDocs.some(d => d.doc_type === dt.key)).length;
        const total = DOC_TYPES.length;
        const req = DOC_TYPES.filter(dt => dt.required).length;
        const reqDone = DOC_TYPES.filter(dt => dt.required && uploadedDocs.some(d => d.doc_type === dt.key)).length;
        hint.textContent = `${reqDone}/${req} ${intakeI18n.t('documents.required_done') || 'required'} · ${done}/${total} ${intakeI18n.t('documents.total') || 'total'}`;
    }
}

window.pickDocFile = async function(docType) {
    // Jeśli dokument już jest wgrany, usuń stary przed nowym (replace, nie append)
    const docType_def = DOC_TYPES.find(d => d.key === docType);
    if (!docType_def?.multi) {
        const existing = uploadedDocs.filter(d => d.doc_type === docType);
        if (existing.length > 0) {
            const confirmed = confirm(intakeI18n.t('documents.confirm_replace') || 'Replace existing file?');
            if (!confirmed) return;
            for (const d of existing) {
                await db.storage.from('intake-docs').remove([d.storage_path]);
                await db.from('gmp_intake_documents').delete().eq('id', d.id);
            }
            uploadedDocs = uploadedDocs.filter(d => d.doc_type !== docType);
        }
    }
    triggerCapture(docType);
};

// === REVIEW ===
function renderReview() {
    const el = document.getElementById('review-content');
    const lang = intakeI18n.getCurrentLanguage();

    const sections = [
        { key: 'personal', icon: 'ph-user', step: 1, label: intakeI18n.t('review.section_personal') || 'Personal',
          rows: [
            ['first_name', intakeI18n.t('personal.first_name') || 'First name'],
            ['last_name', intakeI18n.t('personal.last_name') || 'Last name'],
            ['birth_date', intakeI18n.t('personal.birth_date') || 'Birth date'],
            ['gender', intakeI18n.t('personal.gender') || 'Gender', v => ({M:'♂ Male',F:'♀ Female',X:'Other'}[v] || v)],
            ['nationality', intakeI18n.t('personal.nationality') || 'Nationality', v => {
                const c = window.COUNTRIES.find(x => x.c === v);
                return c ? `${c.f} ${window.getCountryName(v, lang)}` : v;
            }],
          ]
        },
        { key: 'passport', icon: 'ph-identification-card', step: 4, label: intakeI18n.t('review.section_passport') || 'Passport',
          rows: [
            ['passport_number', intakeI18n.t('personal.passport_number') || 'Number'],
            ['passport_expiry', intakeI18n.t('personal.passport_expiry') || 'Expiry'],
            ['passport_issuing', intakeI18n.t('personal.passport_issuing') || 'Issued by', v => {
                const c = window.COUNTRIES.find(x => x.c === v);
                return c ? `${c.f} ${window.getCountryName(v, lang)}` : v;
            }],
          ]
        },
        { key: 'contact', icon: 'ph-phone', step: 5, label: intakeI18n.t('review.section_contact') || 'Contact',
          rows: [
            ['phone', intakeI18n.t('contact.phone') || 'Phone'],
            ['email', intakeI18n.t('contact.email') || 'Email'],
            ['whatsapp_number', intakeI18n.t('contact.whatsapp_number') || 'WhatsApp'],
            ['preferred_contact', intakeI18n.t('contact.preferred_contact') || 'Preferred'],
          ]
        },
        { key: 'address', icon: 'ph-map-pin', step: 7, label: intakeI18n.t('review.section_address') || 'Address',
          rows: [
            ['zip', intakeI18n.t('address.zip') || 'ZIP'],
            ['city', intakeI18n.t('address.city') || 'City'],
            ['street', intakeI18n.t('address.street') || 'Street'],
            ['building', intakeI18n.t('address.building') || 'Building'],
            ['flat', intakeI18n.t('address.flat') || 'Flat'],
            ['voivodeship', intakeI18n.t('address.voivodeship') || 'Voivodeship'],
            ['registration_type', intakeI18n.t('address.registration_type') || 'Registration'],
          ]
        },
        { key: 'employment', icon: 'ph-briefcase', step: 9, label: intakeI18n.t('review.section_employment') || 'Employment',
          rows: [
            ['has_job', intakeI18n.t('employment.has_job') || 'Works in PL', v => v === 'yes' ? '✓ Yes' : 'No'],
            ['employer_name', intakeI18n.t('employment.employer_name') || 'Employer'],
            ['employer_nip', intakeI18n.t('employment.employer_nip') || 'NIP'],
            ['position', intakeI18n.t('employment.position') || 'Position'],
            ['contract_type', intakeI18n.t('employment.contract_type') || 'Contract'],
            ['salary_gross', intakeI18n.t('employment.salary_gross') || 'Salary', v => v ? `${Number(v).toLocaleString('pl-PL')} PLN` : ''],
            ['working_hours', intakeI18n.t('employment.working_hours') || 'Hours'],
          ]
        },
        { key: 'history', icon: 'ph-globe', step: 12, label: intakeI18n.t('review.section_history') || 'History',
          rows: [
            ['arrival_date', intakeI18n.t('history.arrival_date') || 'Arrived'],
            ['current_visa', intakeI18n.t('history.current_visa') || 'Current doc'],
            ['had_refusal', intakeI18n.t('history.had_refusal') || 'Had refusals', v => v === 'yes' ? 'Yes' : 'No'],
          ]
        },
        { key: 'purpose', icon: 'ph-target', step: 13, label: intakeI18n.t('review.section_purpose') || 'Purpose',
          rows: [
            ['purpose', intakeI18n.t('q.purpose.title') || 'Purpose'],
            ['ground', intakeI18n.t('purpose.ground') || 'Legal ground'],
          ]
        },
    ];

    let html = sections.map(sec => {
        const rows = sec.rows.map(([field, label, transform]) => {
            const v = formData[field];
            if (v === undefined || v === null || v === '') return '';
            const display = transform ? transform(v) : v;
            if (!display) return '';
            return `<div class="review-row"><span class="k">${label}</span><span class="v">${escapeHtml(String(display))}</span></div>`;
        }).filter(Boolean).join('');
        if (!rows) return '';
        return `<div class="review-section">
            <div class="review-header">
                <div class="review-header-l"><i class="ph ${sec.icon}"></i> <strong>${sec.label}</strong></div>
                <button class="review-edit" onclick="editFromReview(${sec.step})">${intakeI18n.t('common.edit') || 'Edit'}</button>
            </div>
            <div class="review-body">${rows}</div>
        </div>`;
    }).join('');

    // Documents
    const docRows = DOC_TYPES.map(dt => {
        const has = uploadedDocs.some(d => d.doc_type === dt.key);
        const cnt = uploadedDocs.filter(d => d.doc_type === dt.key).length;
        const reqMark = dt.required ? ' <span style="color: var(--danger)">*</span>' : '';
        return `<div class="review-row">
            <span class="k">${intakeI18n.t('documents.' + dt.key) || dt.key}${reqMark}</span>
            <span class="v">${has ? `<span style="color: var(--success-text)">✓ ${cnt}</span>` : '<span style="color: var(--text-muted)">—</span>'}</span>
        </div>`;
    }).join('');
    html += `<div class="review-section">
        <div class="review-header">
            <div class="review-header-l"><i class="ph ph-files"></i> <strong>${intakeI18n.t('review.section_documents') || 'Documents'}</strong></div>
            <button class="review-edit" onclick="goToStep(14)">${intakeI18n.t('common.edit') || 'Edit'}</button>
        </div>
        <div class="review-body">${docRows}</div>
    </div>`;

    el.innerHTML = html;
}

window.editFromReview = function(step) {
    returnToReview = true;
    goToStep(step);
};

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }

// === SUBMIT ===
async function submitIntake() {
    if (!formData.agree_processing) return;
    const btn = document.getElementById('btn-next');
    btn.disabled = true;
    btn.classList.add('loading');
    const textEl = document.getElementById('btn-next-text');
    const icoEl = document.getElementById('btn-next-ico');
    textEl.textContent = intakeI18n.t('common.sending') || 'Sending…';
    icoEl.className = 'spinner-sm';
    icoEl.style.cssText = 'width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 700ms linear infinite;';

    const { error } = await db.from('gmp_intake_tokens').update({
        data: formData,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
    }).eq('id', intake.id);

    if (error) {
        alert('Error: ' + error.message);
        btn.disabled = false;
        btn.classList.remove('loading');
        return;
    }

    goToStep(16);
}

// Language change listener
document.addEventListener('intake-lang-changed', () => {
    renderLangPicker();
    renderDocs();
    if (currentStep === 15) renderReview();
});

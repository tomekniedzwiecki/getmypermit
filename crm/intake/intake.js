// Client intake — core logic
// Supabase client, step navigation, auto-save, uploads, review

const SUPABASE_URL = 'https://gfwsdrbywgmceateubyq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd3NkcmJ5d2dtY2VhdGV1YnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0Mzg1MjksImV4cCI6MjA5MjAxNDUyOX0.Qnn4MbtfApJ8sVwkpXNqNoHCBcGymS2U04kRLIVRta0';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TOTAL_STEPS = 9;
const DOC_TYPES = [
    { key: 'passport',       required: true,  icon: 'ph-identification-card' },
    { key: 'contract',       required: false, icon: 'ph-file-text' },
    { key: 'payslips',       required: false, icon: 'ph-receipt',      multi: true, expect: 3 },
    { key: 'zus',            required: false, icon: 'ph-bank' },
    { key: 'photo_bio',      required: true,  icon: 'ph-user-square' },
    { key: 'registration',   required: false, icon: 'ph-house' },
    { key: 'birth_cert',     required: false, icon: 'ph-scroll' },
];

let intake = null;        // row from gmp_intake_tokens
let formData = {};
let uploadedDocs = [];    // cache of intake_documents

// === INIT ===
(async function init() {
    const token = new URLSearchParams(location.search).get('t') || new URLSearchParams(location.search).get('token');
    if (!token) return showExpired('Missing token');

    const { data, error } = await db.from('gmp_intake_tokens').select('*').eq('token', token).maybeSingle();
    if (error || !data) return showExpired('Token not found');

    if (new Date(data.expires_at) < new Date()) return showExpired('Token expired');
    if (data.status === 'submitted' || data.status === 'approved' || data.status === 'rejected') {
        // Klient już wysłał - pokazujemy success
        intake = data;
        showApp();
        goToStep(9);
        return;
    }

    intake = data;
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
    setupFields();
    setupNav();
    setupConditionalFields();
    renderDocs();
    goToStep(Math.min(data.current_step || 0, 8));
})();

function showExpired(reason) {
    console.warn('intake expired:', reason);
    document.getElementById('state-loading').classList.add('hidden');
    document.getElementById('state-expired').classList.remove('hidden');
    document.getElementById('state-expired').style.display = 'flex';
    applyI18n();
}

function showApp() {
    document.getElementById('state-loading').classList.add('hidden');
    document.getElementById('state-app').classList.remove('hidden');
    document.getElementById('state-app').style.display = 'flex';
}

// === I18N ===
function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = intakeI18n.t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = intakeI18n.t(el.dataset.i18nPlaceholder);
    });
    document.getElementById('lang-flag').textContent = intakeI18n.LANG_FLAGS[intakeI18n.getCurrentLanguage()];
    document.getElementById('lang-code').textContent = intakeI18n.getCurrentLanguage().toUpperCase();
    // Title
    document.title = intakeI18n.t('meta.title');
}

function renderLangPicker() {
    const el = document.getElementById('lang-options');
    el.innerHTML = intakeI18n.getSupportedLanguages().map(l => `
        <div class="lang-option ${l.code === intakeI18n.getCurrentLanguage() ? 'active' : ''}" onclick="pickLang('${l.code}')">
            <span class="flag">${l.flag}</span>
            <span>${l.name}</span>
        </div>
    `).join('');
    document.getElementById('lang-btn').addEventListener('click', () => document.getElementById('lang-sheet').classList.add('open'));
}
window.pickLang = async function(code) {
    intakeI18n.setLanguage(code);
    closeLangSheet();
    applyI18n();
    if (intake) {
        await db.from('gmp_intake_tokens').update({ language: code }).eq('id', intake.id);
    }
};
window.closeLangSheet = () => document.getElementById('lang-sheet').classList.remove('open');

document.addEventListener('intake-lang-changed', () => {
    renderLangPicker();
    renderDocs();
    if (currentStep === 8) renderReview();
});

// === STEP NAVIGATION ===
let currentStep = 0;

function goToStep(n) {
    if (n < 0 || n > TOTAL_STEPS) return;
    currentStep = n;

    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step-${n}`).classList.add('active');

    // Progress
    const pct = Math.round((n / (TOTAL_STEPS - 1)) * 100);
    document.getElementById('progress-fill').style.width = pct + '%';
    document.getElementById('step-count').textContent = n === 0 ? intakeI18n.t('common.min_estimated') : `${n} / ${TOTAL_STEPS - 1}`;

    // Bottom nav
    const nav = document.getElementById('step-nav');
    const back = document.getElementById('btn-back');
    const nextText = document.getElementById('btn-next-text');
    const nextBtn = document.getElementById('btn-next');

    if (n === 0) {
        back.style.display = 'none';
        nextText.textContent = intakeI18n.t('welcome.start');
        nextBtn.style.display = '';
    } else if (n === 8) {
        back.style.display = '';
        nextText.textContent = intakeI18n.t('review.send');
        nextBtn.style.display = '';
    } else if (n === 9) {
        nav.style.display = 'none';
        return;
    } else {
        back.style.display = '';
        nextText.textContent = intakeI18n.t('common.next');
        nextBtn.style.display = '';
    }
    nav.style.display = '';

    // Step-specific
    if (n === 7) renderDocs();
    if (n === 8) renderReview();
    validateCurrentStep();

    // Save step
    if (intake && intake.current_step !== n) {
        db.from('gmp_intake_tokens').update({ current_step: n }).eq('id', intake.id);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupNav() {
    document.getElementById('btn-next').addEventListener('click', async () => {
        if (currentStep === 8) {
            // Submit
            await submitIntake();
            return;
        }
        if (!validateCurrentStep()) return;
        goToStep(currentStep + 1);
    });
    document.getElementById('btn-back').addEventListener('click', () => goToStep(Math.max(0, currentStep - 1)));
}

// === FIELDS / AUTO-SAVE ===
function setupFields() {
    // Load existing values
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

    // Listen for changes (debounced save)
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
            } else {
                formData[key] = el.value;
            }
            validateCurrentStep();
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

// === CONDITIONAL FIELDS ===
function setupConditionalFields() {
    // Previous cards → details textarea
    document.querySelectorAll('[data-field="had_previous"]').forEach(r => r.addEventListener('change', () => {
        document.getElementById('previous-details-field').style.display = formData.had_previous === 'yes' ? '' : 'none';
    }));
    if (formData.had_previous === 'yes') document.getElementById('previous-details-field').style.display = '';

    document.querySelectorAll('[data-field="had_refusal"]').forEach(r => r.addEventListener('change', () => {
        document.getElementById('refusal-details-field').style.display = formData.had_refusal === 'yes' ? '' : 'none';
    }));
    if (formData.had_refusal === 'yes') document.getElementById('refusal-details-field').style.display = '';

    // Has job → show/hide employment details
    document.querySelectorAll('[data-field="has_job"]').forEach(r => r.addEventListener('change', () => {
        document.getElementById('employment-details').style.display = formData.has_job === 'yes' ? '' : 'none';
    }));
    if (formData.has_job === 'no') document.getElementById('employment-details').style.display = 'none';
}

// Quick-pick arrival date
window.setArrivalDate = function(daysBack) {
    const d = new Date();
    d.setDate(d.getDate() - daysBack);
    const el = document.querySelector('[data-field="arrival_date"]');
    el.value = d.toISOString().slice(0, 10);
    formData.arrival_date = el.value;
    saveData();
};

// === VALIDATION ===
const REQUIRED_PER_STEP = {
    0: [],
    1: ['first_name', 'last_name', 'birth_date', 'nationality', 'passport_number', 'passport_expiry'],
    2: ['phone', 'email'],
    3: ['zip', 'city'],
    4: [],  // employment optional
    5: ['arrival_date'],
    6: ['purpose'],
    7: [],  // documents checked separately
    8: ['agree_processing'],
};

function validateCurrentStep() {
    const required = REQUIRED_PER_STEP[currentStep] || [];
    const errors = [];
    required.forEach(k => {
        const v = formData[k];
        if (v === undefined || v === null || v === '' || v === false) errors.push(k);
    });
    // Step 1 conditional: if has_job === 'yes', require salary
    if (currentStep === 4 && formData.has_job === 'yes') {
        if (!formData.employer_nip) errors.push('employer_nip');
        if (!formData.salary_gross) errors.push('salary_gross');
    }
    // Visual clear all errors then set
    document.querySelectorAll('.field.has-error').forEach(f => f.classList.remove('has-error'));

    const nextBtn = document.getElementById('btn-next');
    nextBtn.disabled = errors.length > 0;
    return errors.length === 0;
}

// === DOCUMENT UPLOADS ===
window.handleDocUpload = async function(docType, event) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = ''; // reset

    if (file.size > 10 * 1024 * 1024) {
        alert(intakeI18n.t('documents.file_too_large'));
        return;
    }

    // Simple progress UI
    const status = document.getElementById(`${docType}-status`) || document.createElement('div');

    // Upload to Supabase Storage: token-based path
    const ext = file.name.split('.').pop();
    const path = `${intake.token}/${docType}_${Date.now()}.${ext}`;

    const { error: upErr } = await db.storage.from('intake-docs').upload(path, file, { contentType: file.type });
    if (upErr) {
        console.error('upload error:', upErr);
        alert('Upload error: ' + upErr.message);
        return;
    }

    // Insert record
    const { data: doc, error: insErr } = await db.from('gmp_intake_documents').insert({
        intake_id: intake.id,
        doc_type: docType,
        storage_path: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
    }).select().single();

    if (insErr) { console.error(insErr); return; }

    uploadedDocs.push(doc);
    renderDocs();
    saveData();
};

function renderDocs() {
    const el = document.getElementById('docs-list');
    if (!el) return;
    const docsHtml = DOC_TYPES.map(dt => {
        const uploads = uploadedDocs.filter(d => d.doc_type === dt.key);
        const hasAny = uploads.length > 0;
        const statusClass = hasAny ? 'uploaded' : '';
        return `
            <div class="doc-item ${statusClass}" data-doc-type="${dt.key}">
                <div class="doc-ic"><i class="ph ${dt.icon}"></i></div>
                <div class="doc-body">
                    <div class="doc-title">${intakeI18n.t('documents.' + dt.key)} ${dt.required ? '<span style="color: var(--danger)">*</span>' : ''}</div>
                    <div class="doc-sub">
                        ${hasAny ? uploads.length + ' file(s) · ' + intakeI18n.t('documents.valid') : intakeI18n.t('documents.' + dt.key + '_desc')}
                    </div>
                </div>
                ${hasAny ? `<button class="doc-action remove" onclick="removeAllDocsOfType('${dt.key}')">${intakeI18n.t('documents.remove_file')}</button>` :
                        `<button class="doc-action" onclick="pickDocFile('${dt.key}')">${intakeI18n.t('documents.upload_hint')}</button>`}
            </div>`;
    }).join('');
    el.innerHTML = docsHtml;

    const total = DOC_TYPES.length;
    const done = DOC_TYPES.filter(dt => uploadedDocs.some(d => d.doc_type === dt.key)).length;
    const hint = document.getElementById('docs-progress-hint');
    if (hint) hint.textContent = intakeI18n.t('documents.progress', { done, total });
}

window.pickDocFile = function(docType) {
    const input = document.getElementById('doc-file');
    input.onchange = (e) => handleDocUpload(docType, e);
    input.click();
};

window.removeAllDocsOfType = async function(docType) {
    const toRemove = uploadedDocs.filter(d => d.doc_type === docType);
    for (const d of toRemove) {
        await db.storage.from('intake-docs').remove([d.storage_path]);
        await db.from('gmp_intake_documents').delete().eq('id', d.id);
    }
    uploadedDocs = uploadedDocs.filter(d => d.doc_type !== docType);
    renderDocs();
};

// === REVIEW ===
function renderReview() {
    const el = document.getElementById('review-content');

    const sections = [
        { key: 'personal', fields: ['first_name', 'last_name', 'birth_date', 'nationality', 'passport_number', 'passport_expiry'], step: 1 },
        { key: 'contact', fields: ['phone', 'email', 'whatsapp_number', 'preferred_contact'], step: 2 },
        { key: 'address', fields: ['zip', 'city', 'street', 'building', 'voivodeship'], step: 3 },
        { key: 'employment', fields: ['has_job', 'employer_name', 'employer_nip', 'position', 'contract_type', 'salary_gross'], step: 4 },
        { key: 'history', fields: ['arrival_date', 'current_visa', 'had_previous', 'had_refusal'], step: 5 },
        { key: 'purpose', fields: ['purpose', 'ground', 'situation'], step: 6 },
    ];

    let html = sections.map(sec => {
        const rows = sec.fields.map(f => {
            const v = formData[f];
            if (v === undefined || v === null || v === '') return null;
            let val = v;
            // Pretty labels for enum values
            const enumKeys = ['purpose', 'ground', 'situation', 'voivodeship', 'current_visa', 'contract_type', 'preferred_contact', 'registration_type'];
            if (enumKeys.includes(f)) {
                const tryKey = `${sec.key}.${f}_${v}`.replace('purpose.purpose_', 'purpose.').replace('_value', '');
                val = intakeI18n.t(tryKey) !== tryKey ? intakeI18n.t(tryKey) : v;
            }
            return `<div class="review-row"><span class="k">${intakeI18n.t(sec.key + '.' + f) || f}</span><span class="v">${escapeHtml(String(val))}</span></div>`;
        }).filter(Boolean).join('');

        if (!rows) return '';
        return `
        <div class="review-section">
            <div class="review-header">
                <span>${intakeI18n.t('review.section_' + sec.key)}</span>
                <button class="review-edit" onclick="goToStep(${sec.step})">${intakeI18n.t('common.edit')}</button>
            </div>
            <div class="review-body">${rows}</div>
        </div>`;
    }).join('');

    // Documents
    const docRows = DOC_TYPES.map(dt => {
        const has = uploadedDocs.some(d => d.doc_type === dt.key);
        return `<div class="review-row"><span class="k">${intakeI18n.t('documents.' + dt.key)}</span><span class="v">${has ? '✓' : '—'}</span></div>`;
    }).join('');
    html += `
        <div class="review-section">
            <div class="review-header">
                <span>${intakeI18n.t('review.section_documents')}</span>
                <button class="review-edit" onclick="goToStep(7)">${intakeI18n.t('common.edit')}</button>
            </div>
            <div class="review-body">${docRows}</div>
        </div>`;

    el.innerHTML = html;
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }

// === SUBMIT ===
async function submitIntake() {
    if (!formData.agree_processing) return;
    const btn = document.getElementById('btn-next');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="width: 18px; height: 18px; border-width: 2px"></span> ${intakeI18n.t('common.saving')}`;

    const { error } = await db.from('gmp_intake_tokens').update({
        data: formData,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
    }).eq('id', intake.id);

    if (error) {
        alert('Error: ' + error.message);
        btn.disabled = false;
        return;
    }

    goToStep(9);
}

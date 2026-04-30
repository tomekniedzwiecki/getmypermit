// ============================================================================
// crm/components/document-generator.js
// Etap II-A § II-A.6 — Generator dokumentów (sekcja "Pakiet startowy")
// ============================================================================
// Wywołanie:
//   import { renderDocumentGenerator } from './components/document-generator.js';
//   await renderDocumentGenerator(caseId, supabase, '#document-generator-section');
// ============================================================================

export async function loadTemplates(supabase) {
    const { data, error } = await supabase.from('gmp_document_templates')
        .select('id, name, kind, sort_order, auto_in_startup_pack, auto_for_party_types, required_fields, version')
        .eq('is_active', true)
        .order('sort_order');
    if (error) {
        console.warn('[document-generator] loadTemplates error:', error);
        return [];
    }
    return data || [];
}

export async function loadGeneratedDocs(caseId, supabase) {
    const { data, error } = await supabase.from('gmp_documents')
        .select('id, name, template_id, status, doc_type, file_size, created_at, storage_path')
        .eq('case_id', caseId)
        .eq('source', 'generated')
        .order('created_at', { ascending: false });
    if (error) {
        console.warn('[document-generator] loadGeneratedDocs error:', error);
        return [];
    }
    return data || [];
}

export async function generateDocument(caseId, templateId, supabase) {
    // supabase.functions.invoke() automatycznie używa session JWT
    const { data, error } = await supabase.functions.invoke('generate-document', {
        body: { case_id: caseId, template_id: templateId },
    });
    if (error) {
        // FunctionsHttpError ma context.body często z payloadem error response
        let detail = error.message;
        try {
            if (error.context && typeof error.context.json === 'function') {
                const errBody = await error.context.json();
                detail = errBody.error || detail;
                if (errBody.status === 'missing_fields') return errBody;
                if (errBody.status === 'recent_duplicate') return errBody;
            }
        } catch {}
        throw new Error(detail || 'Generate function error');
    }
    return data;
}

export async function getSignedDownloadUrl(storagePath, supabase, ttl = 600) {
    const { data, error } = await supabase.storage
        .from('case-documents')
        .createSignedUrl(storagePath, ttl);
    if (error) throw error;
    return data.signedUrl;
}

export async function renderDocumentGenerator(caseId, supabase, targetSelector, options = {}) {
    const target = document.querySelector(targetSelector);
    if (!target) return;

    target.innerHTML = `
        <div class="p-4 text-zinc-500 text-sm">
            <span class="spinner inline-block mr-2"></span>Ładuję szablony...
        </div>
    `;

    try {
        const [templates, generated] = await Promise.all([
            loadTemplates(supabase),
            loadGeneratedDocs(caseId, supabase),
        ]);

        // Mapa template_id → ostatni wygenerowany dokument
        const lastGen = {};
        for (const doc of generated) {
            if (doc.template_id && !lastGen[doc.template_id]) {
                lastGen[doc.template_id] = doc;
            }
        }

        // Filtrowanie wg party_type sprawy (jeśli przekazane)
        const partyType = options.partyType;
        const eligible = templates.filter(t => {
            if (!t.auto_for_party_types || t.auto_for_party_types.length === 0) return true;
            return !partyType || t.auto_for_party_types.includes(partyType);
        });

        if (eligible.length === 0) {
            target.innerHTML = '<div class="p-4 text-zinc-500 text-sm">Brak dostępnych szablonów dla tej sprawy.</div>';
            return;
        }

        const html = eligible.map(t => {
            const last = lastGen[t.id];
            const status = last ? '✓' : '○';
            const statusColor = last ? 'text-emerald-400' : 'text-zinc-600';
            const action = last
                ? `
                    <a href="#" data-action="download" data-doc-id="${last.id}" data-storage-path="${escapeAttr(last.storage_path)}"
                       class="btn btn-ghost btn-sm">
                        <i class="ph ph-download-simple"></i> Pobierz
                    </a>
                    <button data-action="regenerate" data-tpl-id="${t.id}" class="btn btn-ghost btn-sm" title="Wygeneruj ponownie">
                        <i class="ph ph-arrow-counter-clockwise"></i>
                    </button>
                `
                : `
                    <button data-action="generate" data-tpl-id="${t.id}" class="btn btn-secondary btn-sm">
                        <i class="ph ph-play"></i> Generuj
                    </button>
                `;
            return `
                <div class="generator-row flex items-center justify-between py-2 border-b border-zinc-800/40 last:border-0">
                    <div class="flex items-center gap-3">
                        <span class="${statusColor} text-lg" title="${last ? 'Wygenerowany' : 'Nie wygenerowano'}">${status}</span>
                        <div>
                            <div class="text-zinc-200 text-sm">${escapeHtml(t.name)}</div>
                            ${last ? `<div class="text-xs text-zinc-500">${formatDate(last.created_at)} · ${(last.file_size/1024).toFixed(0)} KB</div>` : ''}
                        </div>
                    </div>
                    <div class="flex items-center gap-1">${action}</div>
                </div>
            `;
        }).join('');

        target.innerHTML = `
            <div class="generator-section">
                <div class="text-xs text-zinc-500 mb-2 px-1">
                    Wygeneruj dokumenty automatycznie z danych sprawy. Każdy klik tworzy nowy plik DOCX (poprzedni zostaje w historii).
                </div>
                ${html}
            </div>
        `;

        // Event delegation
        target.querySelectorAll('[data-action="generate"], [data-action="regenerate"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const tplId = btn.dataset.tplId;
                const tpl = eligible.find(t => t.id === tplId);
                btn.disabled = true;
                const originalHtml = btn.innerHTML;
                btn.innerHTML = '<span class="spinner inline-block mr-1"></span> Generuję...';

                try {
                    const result = await generateDocument(caseId, tplId, supabase);

                    if (result.status === 'missing_fields') {
                        alert(`Brakuje danych dla szablonu "${tpl.name}":\n${result.missing_fields.join(', ')}\n\nUzupełnij dane w karcie sprawy i spróbuj ponownie.`);
                    } else if (result.status === 'recent_duplicate') {
                        alert(result.message);
                    } else if (result.download_url) {
                        // Auto-download wygenerowanego pliku
                        const a = document.createElement('a');
                        a.href = result.download_url;
                        a.download = result.file_name || 'document.docx';
                        a.click();
                        // Reload listy
                        await renderDocumentGenerator(caseId, supabase, targetSelector, options);
                        if (window.toast) toast.success(`Wygenerowano: ${tpl.name}`);
                    } else if (result.error) {
                        alert('Błąd: ' + result.error);
                    }
                } catch (err) {
                    alert('Błąd generacji: ' + err.message);
                    console.error('[document-generator] generate failed:', err);
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                }
            });
        });

        target.querySelectorAll('[data-action="download"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    const url = await getSignedDownloadUrl(btn.dataset.storagePath, supabase);
                    window.open(url, '_blank');
                } catch (err) {
                    alert('Nie udało się pobrać: ' + err.message);
                }
            });
        });
    } catch (err) {
        target.innerHTML = `<div class="p-4 text-red-400 text-sm">Błąd: ${escapeHtml(err.message)}</div>`;
    }
}

function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(s) {
    if (s == null) return '';
    return String(s).replace(/"/g, '&quot;');
}
function formatDate(d) {
    try {
        return new Date(d).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });
    } catch { return d; }
}

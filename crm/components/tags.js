// Reusable tags component
// Usage:
//   gmpTags.render(containerEl, { entityType: 'case', entityId: 'uuid', editable: true, onChange: () => {} })
//   gmpTags.chip(tag) → HTML string
//
// Loads all tags once (cached), then per-entity lookup. Call gmpTags.refresh() after creating new tag.

(function() {
    let allTagsCache = null;
    let allTagsPromise = null;

    async function loadAllTags() {
        if (allTagsCache) return allTagsCache;
        if (allTagsPromise) return allTagsPromise;
        allTagsPromise = db.from('gmp_tags').select('id, name, color, description').order('name').then(({ data }) => {
            allTagsCache = data || [];
            allTagsPromise = null;
            return allTagsCache;
        });
        return allTagsPromise;
    }

    function chip(tag, opts = {}) {
        const { removable = false, small = false } = opts;
        const onRemove = removable ? `data-remove-tag="${tag.id}"` : '';
        const size = small ? 'tag-chip-sm' : '';
        return `<span class="tag-chip ${size}" style="--tag-color: ${tag.color}" title="${esc(tag.description || tag.name)}">
            <span class="tag-dot"></span>${esc(tag.name)}${removable ? `<button class="tag-rm" ${onRemove}><i class="ph ph-x"></i></button>` : ''}
        </span>`;
    }

    function dot(tag) {
        return `<span class="tag-dot" style="background: ${tag.color}" title="${esc(tag.name)}"></span>`;
    }

    // Render tag editor inside a container
    // Options: entityType, entityId, initialTags (array of {id,name,color}), editable, onChange
    async function render(containerEl, opts) {
        const { entityType, entityId, editable = true, onChange } = opts;
        let tags = opts.initialTags;
        if (!tags) {
            const { data } = await db.from('gmp_entity_tags')
                .select('tag_id, gmp_tags!inner(id, name, color, description)')
                .eq('entity_type', entityType).eq('entity_id', entityId);
            tags = (data || []).map(r => r.gmp_tags);
        }

        function draw() {
            const chipsHTML = tags.map(t => chip(t, { removable: editable, small: true })).join('');
            const addBtn = editable ? `<button class="tag-add-btn" data-add-tag><i class="ph ph-plus"></i> Tag</button>` : '';
            containerEl.innerHTML = `<div class="tag-row">${chipsHTML}${addBtn}</div>`;

            if (!editable) return;
            containerEl.querySelectorAll('[data-remove-tag]').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.preventDefault(); e.stopPropagation();
                    const tagId = btn.dataset.removeTag;
                    await db.from('gmp_entity_tags').delete()
                        .eq('entity_type', entityType).eq('entity_id', entityId).eq('tag_id', tagId);
                    tags = tags.filter(t => t.id !== tagId);
                    draw();
                    if (onChange) onChange(tags);
                });
            });
            const addBtnEl = containerEl.querySelector('[data-add-tag]');
            if (addBtnEl) addBtnEl.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                openPicker(addBtnEl);
            });
        }

        async function openPicker(anchorEl) {
            closePicker();
            const all = await loadAllTags();
            const availableTags = all.filter(t => !tags.some(current => current.id === t.id));

            const picker = document.createElement('div');
            picker.className = 'tag-picker';
            picker.innerHTML = `
                <input type="text" class="tag-search" placeholder="Szukaj lub utwórz..." autofocus>
                <div class="tag-options">
                    ${availableTags.map(t => `<div class="tag-option" data-tag-id="${t.id}">
                        ${chip(t, { small: true })}
                        ${t.description ? `<span class="tag-opt-desc">${esc(t.description)}</span>` : ''}
                    </div>`).join('')}
                    ${availableTags.length === 0 ? '<div class="tag-option-empty">Wszystkie tagi już dodane</div>' : ''}
                </div>
                <div class="tag-create hidden">
                    <div class="tag-create-label">Utwórz tag:</div>
                    <div class="tag-create-preview"></div>
                    <div class="tag-create-actions">
                        <div class="tag-colors">
                            ${['#ef4444','#f59e0b','#10b981','#06b6d4','#6366f1','#a855f7','#ec4899'].map(c =>
                                `<button class="tag-color" data-color="${c}" style="background: ${c}"></button>`
                            ).join('')}
                        </div>
                        <button class="btn btn-primary btn-sm" data-create-tag>Utwórz</button>
                    </div>
                </div>`;

            const rect = anchorEl.getBoundingClientRect();
            picker.style.top = (rect.bottom + window.scrollY + 4) + 'px';
            picker.style.left = (rect.left + window.scrollX) + 'px';

            document.body.appendChild(picker);
            const searchEl = picker.querySelector('.tag-search');
            const optsEl = picker.querySelector('.tag-options');
            const createEl = picker.querySelector('.tag-create');
            const createPreview = picker.querySelector('.tag-create-preview');
            let selectedColor = '#6366f1';
            picker.querySelector(`.tag-color[data-color="${selectedColor}"]`).classList.add('active');

            searchEl.focus();

            function updateCreate() {
                const q = searchEl.value.trim();
                const existingMatch = all.some(t => t.name.toLowerCase() === q.toLowerCase());
                if (q && !existingMatch) {
                    createEl.classList.remove('hidden');
                    createPreview.innerHTML = chip({ name: q, color: selectedColor }, { small: true });
                } else {
                    createEl.classList.add('hidden');
                }
            }

            searchEl.addEventListener('input', () => {
                const q = searchEl.value.toLowerCase();
                optsEl.querySelectorAll('.tag-option').forEach(opt => {
                    const name = opt.querySelector('.tag-chip')?.textContent.trim().toLowerCase() || '';
                    opt.style.display = name.includes(q) ? '' : 'none';
                });
                updateCreate();
            });

            picker.querySelectorAll('.tag-color').forEach(b => b.addEventListener('click', (e) => {
                e.preventDefault();
                picker.querySelectorAll('.tag-color').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                selectedColor = b.dataset.color;
                updateCreate();
            }));

            picker.querySelectorAll('.tag-option').forEach(opt => opt.addEventListener('click', async (e) => {
                e.preventDefault();
                const tagId = opt.dataset.tagId;
                await addTag(tagId);
                closePicker();
            }));

            picker.querySelector('[data-create-tag]')?.addEventListener('click', async (e) => {
                e.preventDefault();
                const name = searchEl.value.trim();
                if (!name) return;
                const { data, error } = await db.from('gmp_tags').insert({
                    name, color: selectedColor, created_by: window.currentStaff?.id,
                }).select().single();
                if (error) { toast.error(error.message); return; }
                allTagsCache = null; // refresh cache
                await addTag(data.id);
                closePicker();
            });

            // Close on outside click / Esc
            setTimeout(() => {
                document.addEventListener('click', outsideClick, { once: true });
                document.addEventListener('keydown', escKey);
            }, 10);

            function outsideClick(e) {
                if (!picker.contains(e.target)) closePicker();
                else document.addEventListener('click', outsideClick, { once: true });
            }
            function escKey(e) {
                if (e.key === 'Escape') closePicker();
            }

            window._tagPicker = { picker, outsideClick, escKey };
        }

        async function addTag(tagId) {
            const all = await loadAllTags();
            const tag = all.find(t => t.id === tagId);
            if (!tag) return;
            if (tags.some(t => t.id === tagId)) return;

            const { error } = await db.from('gmp_entity_tags').insert({
                entity_type: entityType, entity_id: entityId, tag_id: tagId,
                added_by: window.currentStaff?.id,
            });
            if (error) { toast.error(error.message); return; }
            tags.push(tag);
            draw();
            if (onChange) onChange(tags);
        }

        function closePicker() {
            if (window._tagPicker) {
                window._tagPicker.picker.remove();
                document.removeEventListener('keydown', window._tagPicker.escKey);
                delete window._tagPicker;
            }
        }

        draw();
    }

    // Batch fetch tagów for multiple entities - chunked (URL limit)
    async function fetchForEntities(entityType, entityIds) {
        if (!entityIds.length) return {};
        const BATCH_SIZE = 150;  // ~150 UUIDs per .in() query to stay under URL limit
        const byEntity = {};
        for (let i = 0; i < entityIds.length; i += BATCH_SIZE) {
            const chunk = entityIds.slice(i, i + BATCH_SIZE);
            const { data, error } = await db.from('gmp_entity_tags')
                .select('entity_id, tag_id, gmp_tags!inner(id, name, color)')
                .eq('entity_type', entityType)
                .in('entity_id', chunk);
            if (error) { console.error('tags.fetchForEntities:', error); continue; }
            (data || []).forEach(r => {
                if (!byEntity[r.entity_id]) byEntity[r.entity_id] = [];
                byEntity[r.entity_id].push(r.gmp_tags);
            });
        }
        return byEntity;
    }

    function refresh() {
        allTagsCache = null;
        return loadAllTags();
    }

    window.gmpTags = {
        render, chip, dot, loadAll: loadAllTags, fetchForEntities, refresh,
    };
})();

// Pull-to-refresh na mobile — swipe w dół u góry strony wywołuje callback odświeżania.
// Użycie:
//   gmpPullRefresh.init(async () => { await loadList(); });
//
// Cechy:
// - Aktywny tylko na mobile (<=900px)
// - Wymaga scroll top = 0
// - Threshold 80px pull down (po tym release = odśwież)
// - Resistance (efekt rubber band) — 0.5x
// - Animowana strzałka -> spinner po threshold
// - Wyłączony gdy modal otwarty / drawer otwarty
(function() {
    let callback = null;
    let enabled = false;
    let startY = 0;
    let pulling = false;
    let distance = 0;
    const threshold = 80;
    const resistance = 0.5;

    function createIndicator() {
        if (document.getElementById('gmp-pull-indicator')) return;
        const el = document.createElement('div');
        el.id = 'gmp-pull-indicator';
        el.innerHTML = `
            <div class="pti-inner">
                <i class="ph ph-arrow-down pti-arrow" style="display: block"></i>
                <div class="pti-spinner" style="display: none"></div>
            </div>
        `;
        document.body.appendChild(el);
        const style = document.createElement('style');
        style.textContent = `
            #gmp-pull-indicator {
                position: fixed;
                top: 0;
                left: 50%;
                transform: translate(-50%, -60px);
                width: 44px; height: 44px;
                border-radius: 50%;
                background: var(--bg-elevated);
                border: 1px solid var(--border);
                display: flex; align-items: center; justify-content: center;
                z-index: 40;
                box-shadow: var(--shadow-md);
                transition: transform 250ms cubic-bezier(0.32, 0.72, 0, 1), opacity 200ms;
                opacity: 0;
                pointer-events: none;
            }
            #gmp-pull-indicator.visible { opacity: 1; }
            #gmp-pull-indicator .pti-inner { display: flex; align-items: center; justify-content: center; }
            #gmp-pull-indicator .pti-arrow {
                color: var(--text-secondary);
                font-size: 20px;
                transition: transform 150ms;
            }
            #gmp-pull-indicator.ready .pti-arrow {
                color: var(--accent);
                transform: rotate(180deg);
            }
            #gmp-pull-indicator .pti-spinner {
                width: 18px; height: 18px;
                border: 2px solid var(--border);
                border-top-color: var(--accent);
                border-radius: 50%;
                animation: spin 700ms linear infinite;
            }
        `;
        document.head.appendChild(style);
    }

    function updateIndicator(d) {
        const el = document.getElementById('gmp-pull-indicator');
        if (!el) return;
        const offset = Math.min(60 + d, 80);
        el.style.transform = `translate(-50%, ${offset - 60}px)`;
        el.classList.toggle('visible', d > 10);
        el.classList.toggle('ready', d >= threshold);
    }

    function showSpinner() {
        const el = document.getElementById('gmp-pull-indicator');
        if (!el) return;
        el.querySelector('.pti-arrow').style.display = 'none';
        el.querySelector('.pti-spinner').style.display = 'block';
        el.classList.add('visible');
        el.style.transform = 'translate(-50%, 20px)';
    }

    function resetIndicator() {
        const el = document.getElementById('gmp-pull-indicator');
        if (!el) return;
        el.querySelector('.pti-arrow').style.display = 'block';
        el.querySelector('.pti-spinner').style.display = 'none';
        el.classList.remove('visible', 'ready');
        el.style.transform = 'translate(-50%, -60px)';
    }

    function isBlocked() {
        // Modal otwarty
        if (document.querySelector('#modals-container .modal-backdrop')) return true;
        // Sidebar drawer otwarty
        if (document.getElementById('main-sidebar')?.classList.contains('open')) return true;
        // Wewnątrz scrollowalnego kontenera (np. card z overflow-y-auto) — nie rób pull-to-refresh jeśli user scrolluje w środku
        return false;
    }

    function onTouchStart(e) {
        if (!enabled || !callback || isBlocked()) return;
        // Tylko gdy scroll y = 0
        if ((document.scrollingElement || document.documentElement).scrollTop > 0) return;
        if (window.innerWidth > 900) return;
        startY = e.touches[0].clientY;
        pulling = true;
        distance = 0;
    }

    function onTouchMove(e) {
        if (!pulling) return;
        const y = e.touches[0].clientY;
        const delta = y - startY;
        if (delta < 0) { pulling = false; resetIndicator(); return; }
        // User scrolluje w górę od góry — zablokuj native scroll + pokaż indicator
        distance = delta * resistance;
        if (distance > 10) {
            e.preventDefault();  // blokuj native bounce Safari
            updateIndicator(distance);
        }
    }

    async function onTouchEnd() {
        if (!pulling) return;
        pulling = false;
        if (distance >= threshold) {
            showSpinner();
            if (window.gmpHaptic) window.gmpHaptic.tap();
            try {
                await Promise.resolve(callback());
            } catch (e) {
                console.warn('pull-to-refresh callback failed', e);
            }
            setTimeout(resetIndicator, 400);
        } else {
            resetIndicator();
        }
        distance = 0;
    }

    window.gmpPullRefresh = {
        init(cb) {
            callback = cb;
            enabled = true;
            createIndicator();
            document.addEventListener('touchstart', onTouchStart, { passive: true });
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd, { passive: true });
            document.addEventListener('touchcancel', onTouchEnd, { passive: true });
        },
        destroy() {
            enabled = false;
            callback = null;
            document.removeEventListener('touchstart', onTouchStart);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
            document.removeEventListener('touchcancel', onTouchEnd);
        }
    };
})();

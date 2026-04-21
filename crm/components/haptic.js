// Haptic feedback — subtelna wibracja na Android (iOS nie wspiera navigator.vibrate,
// ale też go nie potrzebuje — taktowe przyciski dają own feedback przez iOS haptic engine).
// Użycie: gmpHaptic.tap() / .success() / .warning() / .error() / .heavy()
(function() {
    const canVibrate = 'vibrate' in navigator;

    // Sprawdź czy user włączył "reduce motion" — wtedy wyłącz wibracje (a11y)
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function vibrate(pattern) {
        if (!canVibrate || reduceMotion) return;
        try { navigator.vibrate(pattern); } catch {}
    }

    window.gmpHaptic = {
        // Krótki tap — kliknięcie przycisku, checkbox, tab
        tap: () => vibrate(8),
        // Sukces — wpłata, zadanie zrobione, zatwierdzenie
        success: () => vibrate([12, 40, 18]),
        // Warning — usunięcie, krytyczna akcja
        warning: () => vibrate([20, 30, 20]),
        // Error — walidacja, błąd
        error: () => vibrate([30, 50, 30, 50, 30]),
        // Mocny — długie przytrzymanie, ważna akcja
        heavy: () => vibrate(30),
        // Double tap — podwójny impuls
        double: () => vibrate([6, 30, 6]),
    };

    // Auto-haptic: każdy klik na przycisku .btn-primary + swipe (delegation)
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-primary, .gmp-fab');
        if (btn && !btn.disabled) gmpHaptic.tap();
    }, { capture: true, passive: true });
})();

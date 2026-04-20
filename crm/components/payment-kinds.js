// Stałe i helpery dla gmp_payment_kind
// Uwagi Pawła 2026-04-20: 5 typów płatności zamiast starych 2 (fee vs admin_fee).
// Wprowadzenie helperów zapobiega błędom klasyfikacji typu stamp_fee/client_advance jako "wynagrodzenie".

(function() {
    // Wszystkie rodzaje wpłat typu "przychodowego" klienta (wchodzą do sumy `total_paid`)
    // - fee: wynagrodzenie kancelarii
    // - admin_fee: opłata administracyjna (dla urzędu, ale wpłaca klient)
    // - stamp_fee: opłata skarbowa (dla urzędu)
    // - client_advance_repayment: zwrot tego co kancelaria wyłożyła za klienta
    window.PAYMENT_KIND_INCOME = ['fee', 'admin_fee', 'stamp_fee', 'client_advance_repayment'];

    // Tylko wynagrodzenie (pojęcie "przychód operacyjny kancelarii")
    // UWAGA: null/undefined kind traktowane jako 'fee' dla legacy rekordów
    window.isFeeKind = function(k) {
        return !k || k === 'fee';
    };

    // Opłaty administracyjne (dla urzędu)
    window.isAdminFeeKind = function(k) {
        return k === 'admin_fee' || k === 'stamp_fee';
    };

    // Wydatek kancelarii za klienta (odpływ)
    window.isClientAdvanceKind = function(k) {
        return k === 'client_advance';
    };

    // Zwrot od klienta (pieniądze wracają do kancelarii — ale NIE to samo co wynagrodzenie)
    window.isClientAdvanceRepaymentKind = function(k) {
        return k === 'client_advance_repayment';
    };

    // Human-readable labels
    window.KIND_LABELS = {
        fee: 'Wynagrodzenie',
        admin_fee: 'Opł. administracyjna',
        stamp_fee: 'Opł. skarbowa',
        client_advance: 'Założone za klienta (koszt)',
        client_advance_repayment: 'Założone za klienta (zwrot)',
    };

    window.kindLabel = function(k) {
        return window.KIND_LABELS[k] || k || 'Wynagrodzenie';
    };

    // Kolory CSS dla badge/tekst
    window.KIND_COLORS = {
        fee: 'text-emerald-300',
        admin_fee: 'text-sky-300',
        stamp_fee: 'text-violet-300',
        client_advance: 'text-rose-300',
        client_advance_repayment: 'text-amber-300',
    };
})();

// ============================================================================
// crm/components/validators.js
// Etap I (preview) — E3 — Walidatory PESEL/NIP/phone
// ============================================================================
// Filozofia (zasada Pawła "podpowiada nie blokuje"):
//   Walidatory zwracają { valid, reason, ... } — UI POKAZUJE warning ale NIE
//   blokuje zapisu danych. PESEL valid → auto-fill birth_date.
// ============================================================================

// ============================================================================
// PESEL — 11 cyfr + checksum + walidacja daty urodzenia
// ============================================================================
export function validatePESEL(pesel) {
    if (!pesel || typeof pesel !== 'string') {
        return { valid: false, reason: 'PESEL nie podany' };
    }
    pesel = pesel.replace(/\s/g, '');

    if (!/^\d{11}$/.test(pesel)) {
        return { valid: false, reason: 'PESEL musi zawierać 11 cyfr' };
    }

    const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
    const sum = weights.reduce((s, w, i) => s + w * Number(pesel[i]), 0);
    const checksum = (10 - (sum % 10)) % 10;

    if (checksum !== Number(pesel[10])) {
        return { valid: false, reason: 'Nieprawidłowy checksum' };
    }

    const birthDate = peselToBirthDate(pesel);
    if (!birthDate) {
        return { valid: false, reason: 'Nieprawidłowa data urodzenia w PESEL' };
    }

    const gender = Number(pesel[9]) % 2 === 0 ? 'F' : 'M';

    return { valid: true, birthDate, gender };
}

export function peselToBirthDate(pesel) {
    if (!pesel || pesel.length !== 11) return null;
    let yy = Number(pesel.slice(0, 2));
    let mm = Number(pesel.slice(2, 4));
    const dd = Number(pesel.slice(4, 6));

    let century;
    if (mm >= 1 && mm <= 12)        century = 1900;
    else if (mm >= 21 && mm <= 32)  { century = 2000; mm -= 20; }
    else if (mm >= 41 && mm <= 52)  { century = 2100; mm -= 40; }
    else if (mm >= 61 && mm <= 72)  { century = 2200; mm -= 60; }
    else if (mm >= 81 && mm <= 92)  { century = 1800; mm -= 80; }
    else return null;

    const year = century + yy;
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

    // Test parsability
    const d = new Date(year, mm - 1, dd);
    if (d.getFullYear() !== year || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;

    return d.toISOString().split('T')[0];  // 'YYYY-MM-DD'
}

// ============================================================================
// NIP — 10 cyfr + checksum
// ============================================================================
export function validateNIP(nip) {
    if (!nip) return { valid: false, reason: 'NIP nie podany' };
    nip = String(nip).replace(/[^0-9]/g, '');
    if (nip.length !== 10) {
        return { valid: false, reason: 'NIP musi zawierać 10 cyfr' };
    }

    const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    const sum = weights.reduce((s, w, i) => s + w * Number(nip[i]), 0);
    const checksum = sum % 11;

    if (checksum === 10 || checksum !== Number(nip[9])) {
        return { valid: false, reason: 'Nieprawidłowy checksum' };
    }

    return { valid: true, formatted: nip.replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, '$1-$2-$3-$4') };
}

// ============================================================================
// REGON — 9 lub 14 cyfr + checksum
// ============================================================================
export function validateREGON(regon) {
    if (!regon) return { valid: false, reason: 'REGON nie podany' };
    regon = String(regon).replace(/[^0-9]/g, '');

    if (regon.length === 9) {
        const w = [8, 9, 2, 3, 4, 5, 6, 7];
        const sum = w.reduce((s, ww, i) => s + ww * Number(regon[i]), 0);
        const cs = sum % 11 === 10 ? 0 : sum % 11;
        return cs === Number(regon[8])
            ? { valid: true, formatted: regon }
            : { valid: false, reason: 'Nieprawidłowy checksum (9 cyfr)' };
    }
    if (regon.length === 14) {
        const w = [2, 4, 8, 5, 0, 9, 7, 3, 6, 1, 2, 4, 8];
        const sum = w.reduce((s, ww, i) => s + ww * Number(regon[i]), 0);
        const cs = sum % 11 === 10 ? 0 : sum % 11;
        return cs === Number(regon[13])
            ? { valid: true, formatted: regon }
            : { valid: false, reason: 'Nieprawidłowy checksum (14 cyfr)' };
    }
    return { valid: false, reason: 'REGON musi zawierać 9 lub 14 cyfr' };
}

// ============================================================================
// Polski telefon — +48XXXXXXXXX lub 9 cyfr
// ============================================================================
export function validatePhonePL(phone) {
    if (!phone) return { valid: false, reason: 'Telefon nie podany' };
    const clean = String(phone).replace(/[\s\-\(\)]/g, '');
    if (/^\+48\d{9}$/.test(clean)) {
        return { valid: true, formatted: clean };
    }
    if (/^\d{9}$/.test(clean)) {
        return { valid: true, formatted: '+48' + clean };
    }
    return { valid: false, reason: 'Format: +48XXXXXXXXX lub 9 cyfr' };
}

// ============================================================================
// Email — prosta walidacja
// ============================================================================
export function validateEmail(email) {
    if (!email) return { valid: false, reason: 'Email nie podany' };
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!re.test(email)) {
        return { valid: false, reason: 'Nieprawidłowy format email' };
    }
    return { valid: true, formatted: email.toLowerCase().trim() };
}

// ============================================================================
// Pomocnik UI — wyświetla warning bez blokowania
// ============================================================================
export function attachValidator(inputElement, validator, options = {}) {
    if (!inputElement) return;

    const errorEl = document.createElement('span');
    errorEl.className = 'validator-warning';
    errorEl.style.cssText = 'color: #d97706; font-size: 0.75rem; display: block; margin-top: 0.25rem;';
    inputElement.parentElement?.appendChild(errorEl);

    inputElement.addEventListener('blur', () => {
        const value = inputElement.value;
        if (!value) {
            errorEl.textContent = '';
            return;
        }
        const result = validator(value);
        if (!result.valid) {
            errorEl.textContent = '⚠ ' + result.reason;
        } else {
            errorEl.textContent = '';
            // Auto-fill (np. PESEL → birthDate)
            if (options.onValid) options.onValid(result);
        }
    });
}

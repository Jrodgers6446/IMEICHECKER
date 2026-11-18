const REPORTING_BODIES = {
  '00': 'Test IMEI',
  '01': 'CTIA / PTCRB (United States)',
  '10': 'DECT devices',
  '30': 'Iridium',
  '33': 'DGPT (France)',
  '35': 'TÜV SÜD / BABT (United Kingdom)',
  '44': 'BABT (United Kingdom)',
  '45': 'NTA (Denmark)',
  '49': 'BZT / BAPT (Germany)',
  '50': 'BZT ETS (Germany)',
  '51': 'Cetecom ICT (Germany)',
  '52': 'Cetecom (Germany)',
  '53': 'TÜV (Germany)',
  '54': 'Phoenix Test Lab (Germany)',
  '86': 'TAF (China)',
  '91': 'MSAI (India)',
  '99': 'GHA (multi-RAT 3GPP/3GPP2)',
};

export function luhnCheckDigit(body) {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    let d = Number(body[body.length - 1 - i]);
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return (10 - (sum % 10)) % 10;
}

export function isValidLuhn(digits) {
  return digits.length > 1 && luhnCheckDigit(digits.slice(0, -1)) === Number(digits.at(-1));
}

export function cleanInput(raw) {
  return String(raw ?? '').replace(/[\s-]/g, '');
}

export function reportingBody(tac) {
  const rbi = tac.slice(0, 2);
  if (REPORTING_BODIES[rbi]) return REPORTING_BODIES[rbi];
  if (/^0[2-9]$/.test(rbi)) return 'Test IMEI';
  return null;
}

// Returns { ok: true, imei, tac, serial, checkDigit, calculated } or { ok: false, error, code }.
// A 14-digit input gets its check digit calculated; `calculated` is true then.
export function parseImei(raw) {
  const digits = cleanInput(raw);
  if (!digits) return { ok: false, code: 'empty', error: 'Enter an IMEI.' };
  if (/\D/.test(digits)) {
    return { ok: false, code: 'chars', error: 'An IMEI contains digits only (spaces and dashes are fine).' };
  }
  if (digits.length < 14) {
    return {
      ok: false,
      code: 'short',
      error: `An IMEI has 15 digits (or 14 without the check digit). You entered ${digits.length}.`,
    };
  }
  if (digits.length > 15) {
    const hint = digits.length === 16 ? ' If this is an IMEISV, drop the last two digits.' : '';
    return { ok: false, code: 'long', error: `An IMEI has 15 digits. You entered ${digits.length}.${hint}` };
  }

  let imei = digits;
  let calculated = false;
  if (digits.length === 14) {
    imei = digits + luhnCheckDigit(digits);
    calculated = true;
  } else if (!isValidLuhn(digits)) {
    return {
      ok: false,
      code: 'luhn',
      error: `Check digit is wrong: the last digit should be ${luhnCheckDigit(digits.slice(0, 14))}, not ${digits[14]}. Look for a typo.`,
    };
  }

  return {
    ok: true,
    imei,
    tac: imei.slice(0, 8),
    serial: imei.slice(8, 14),
    checkDigit: imei[14],
    calculated,
  };
}

export function formatImei(imei) {
  return imei.length === 15 ? `${imei.slice(0, 2)}-${imei.slice(2, 8)}-${imei.slice(8, 14)}-${imei[14]}` : imei;
}

// Finds the most plausible IMEI in free text such as a selection on a web page.
export function findImei(text) {
  const candidates = [];
  for (const m of String(text ?? '').matchAll(/(?<!\d)\d(?:[ -]?\d){13,14}(?!\d)/g)) {
    const digits = cleanInput(m[0]);
    if (digits.length === 15 && isValidLuhn(digits)) candidates.push({ digits, rank: 0 });
    else if (digits.length === 14) candidates.push({ digits, rank: 1 });
    else if (digits.length === 15) candidates.push({ digits, rank: 2 });
  }
  candidates.sort((a, b) => a.rank - b.rank);
  return candidates[0]?.digits ?? null;
}

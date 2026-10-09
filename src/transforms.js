// Pure value transforms. Each returns { value, warning? } so migrations can report lossy conversions.
const ok = (value, warning) => (warning ? { value, warning } : { value });

export const isEmpty = (v) => v === undefined || v === null || String(v).trim() === '';

export function email(v) {
  if (isEmpty(v)) return ok(null);
  const s = String(v).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? ok(s) : ok(null, `invalid email "${v}"`);
}

// Normalizes to E.164. Assumes `defaultCountry` calling code (default US/CA "1") for 10-digit numbers.
export function phone(v, { defaultCode = '1' } = {}) {
  if (isEmpty(v)) return ok(null);
  const raw = String(v).trim();
  const [main] = raw.split(/\s*(?:ext\.?|x|#)\s*/i);
  let digits = main.replace(/\D/g, '');
  const extWarn = main.trim() !== raw ? 'extension dropped' : undefined;
  if (main.trim().startsWith('+')) {
    return digits.length >= 8 && digits.length <= 15 ? ok('+' + digits, extWarn) : ok(null, `invalid phone "${v}"`);
  }
  if (digits.length === 10) digits = defaultCode + digits;
  else if (digits.length === 11 && digits.startsWith(defaultCode)) { /* already has code */ }
  else return ok(null, `invalid phone "${v}"`);
  return ok('+' + digits, extWarn);
}

// Accepts ISO, US m/d/y, epoch ms/s. Emits ISO-8601 date (or datetime if time present).
export function date(v, { dayFirst = false } = {}) {
  if (isEmpty(v)) return ok(null);
  const s = String(v).trim();
  if (/^\d{13}$/.test(s)) return ok(new Date(Number(s)).toISOString());
  if (/^\d{10}$/.test(s)) return ok(new Date(Number(s) * 1000).toISOString());
  const slash = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (slash) {
    let [, a, b, y] = slash.map(Number);
    if (y < 100) y += y < 70 ? 2000 : 1900;
    let [m, d] = dayFirst ? [b, a] : [a, b];
    let warning;
    if (m > 12 && d <= 12) { [m, d] = [d, m]; warning = `ambiguous date "${v}" interpreted as ${dayFirst ? 'm/d' : 'd/m'}`; }
    if (m < 1 || m > 12 || d < 1 || d > 31) return ok(null, `invalid date "${v}"`);
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCMonth() !== m - 1) return ok(null, `invalid date "${v}"`);
    return ok(dt.toISOString().slice(0, 10), warning);
  }
  const t = Date.parse(s);
  if (Number.isNaN(t)) return ok(null, `invalid date "${v}"`);
  return ok(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s : new Date(t).toISOString());
}

export function number(v) {
  if (isEmpty(v)) return ok(null);
  const s = String(v).trim();
  const neg = /^\(.*\)$/.test(s) || s.startsWith('-');
  const mult = /k$/i.test(s) ? 1e3 : /m$/i.test(s) ? 1e6 : 1;
  const n = parseFloat(s.replace(/[^0-9.]/g, ''));
  return Number.isNaN(n) ? ok(null, `invalid number "${v}"`) : ok((neg ? -n : n) * mult);
}

export function url(v) {
  if (isEmpty(v)) return ok(null);
  const s = String(v).trim().toLowerCase().replace(/\/+$/, '');
  return /^[a-z0-9.-]+\.[a-z]{2,}(\/|$)|^https?:\/\//.test(s) ? ok(s.replace(/^https?:\/\//, '').replace(/^www\./, '')) : ok(null, `invalid url "${v}"`);
}

export const bool = (v) => (isEmpty(v) ? ok(null) : ok(/^(true|yes|y|1|on)$/i.test(String(v).trim())));
export const string = (v) => (isEmpty(v) ? ok(null) : ok(String(v).trim().replace(/\s+/g, ' ')));

export function picklist(v, { valueMap = {}, strict = false } = {}) {
  if (isEmpty(v)) return ok(null);
  const key = String(v).trim().toLowerCase();
  const hit = Object.entries(valueMap).find(([k]) => k.toLowerCase() === key);
  if (hit) return ok(hit[1]);
  return strict ? ok(null, `unmapped picklist value "${v}"`) : ok(String(v).trim(), `unmapped picklist value "${v}" passed through`);
}

// Name helpers for CRMs that store a single full name (Pipedrive) vs first/last.
export function splitName(full) {
  if (isEmpty(full)) return { first: null, last: null };
  const parts = String(full).trim().split(/\s+/);
  if (parts.length === 1) return { first: null, last: parts[0] };
  return { first: parts.slice(0, -1).join(' '), last: parts.at(-1) };
}
export const joinName = (first, last) => [first, last].filter((x) => !isEmpty(x)).join(' ') || null;

export const TRANSFORMS = { email, phone, date, number, url, bool, string, picklist };

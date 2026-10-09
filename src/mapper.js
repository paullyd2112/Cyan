import { SCHEMAS, SYNONYMS } from './schemas.js';

// Strip location-prefixes CRMs bolt on (MailingCity, BillingState, address_locality, hs_*).
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/^(mailing|billing|address|hs)(?=.)/, '');
const canon = new Map(); // token -> Set of concept ids (a token like "title" can mean job title or deal name)
SYNONYMS.forEach((group, i) => group.forEach((t) => canon.set(t, (canon.get(t) ?? new Set()).add(i))));
const sameConcept = (a, b) => { const x = canon.get(norm(a)), y = canon.get(norm(b)); return !!x && !!y && [...x].some((i) => y.has(i)); };

function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

const TYPE_COMPAT = (a, b) => (a === b ? 1 : [a, b].every((t) => ['string', 'picklist', 'url'].includes(t)) ? 0.7 : 0.2);

export function score(src, dst) {
  const a = norm(src.name), b = norm(dst.name);
  let s;
  if (a === b) s = 1;
  else if (sameConcept(src.name, dst.name)) s = 0.9;
  else s = Math.max(0, 1 - lev(a, b) / Math.max(a.length, b.length)) * 0.8;
  // Mobile vs work phone must not cross-match via the generic "phone" substring.
  if (/mobile|cell/.test(a) !== /mobile|cell/.test(b)) s *= 0.4;
  return s * (0.6 + 0.4 * TYPE_COMPAT(src.type, dst.type));
}

/**
 * Suggest a source->destination field mapping. Greedy best-first so each destination is used once.
 * Returns { mappings: [{from, to, confidence, type}], unmappedSource, unmappedRequired }.
 */
export function suggestMapping(srcCrm, dstCrm, object, { threshold = 0.55 } = {}) {
  const src = SCHEMAS[srcCrm]?.[object], dst = SCHEMAS[dstCrm]?.[object];
  if (!src || !dst) throw new Error(`Unknown CRM/object: ${srcCrm} -> ${dstCrm} (${object})`);
  const pairs = src.flatMap((s) => dst.map((d) => ({ s, d, c: score(s, d) }))).sort((x, y) => y.c - x.c);
  const usedS = new Set(), usedD = new Set(), mappings = [];
  for (const { s, d, c } of pairs) {
    if (c < threshold) break;
    if (usedS.has(s.name) || usedD.has(d.name)) continue;
    usedS.add(s.name); usedD.add(d.name);
    mappings.push({ from: s.name, to: d.name, confidence: +c.toFixed(2), type: d.type });
  }
  return {
    mappings,
    unmappedSource: src.filter((s) => !usedS.has(s.name)).map((s) => s.name),
    unmappedRequired: dst.filter((d) => d.required && !usedD.has(d.name)).map((d) => d.name),
  };
}

import { TRANSFORMS, isEmpty, splitName, joinName } from './transforms.js';

/**
 * plan = {
 *   mappings: [{from, to, type, valueMap?}],
 *   required: [dstField],        // records missing these are rejected
 *   dedupeBy: dstField,          // later duplicates are merged into first (non-empty wins), reported
 *   splitFullName: {from, first, last}   // optional: derive first/last from one column
 *   joinFullName: {first, last, to}      // optional: derive one column from first/last
 *   options: { defaultCode, dayFirst, strictPicklists }
 * }
 */
export function migrate(records, plan) {
  const o = plan.options ?? {};
  const out = [], rejected = [], warnings = [], merged = [];
  const seen = new Map(), staged = [];

  records.forEach((rec, i) => {
    const row = i + 2; // spreadsheet row incl. header
    const dst = {};
    const rowWarn = (w) => warnings.push({ row, warning: w });

    for (const m of plan.mappings) {
      const fn = TRANSFORMS[m.type] ?? TRANSFORMS.string;
      const r = fn(rec[m.from], { ...o, valueMap: m.valueMap, strict: o.strictPicklists });
      if (r.warning) rowWarn(`${m.from}: ${r.warning}`);
      dst[m.to] = r.value;
    }
    if (plan.splitFullName) {
      const { from, first, last } = plan.splitFullName;
      const n = splitName(rec[from]);
      dst[first] ??= n.first; dst[last] ??= n.last;
    }
    if (plan.joinFullName) {
      const { first, last, to } = plan.joinFullName;
      dst[to] = joinName(rec[first], rec[last]);
    }

    const key = plan.dedupeBy && !isEmpty(dst[plan.dedupeBy]) ? String(dst[plan.dedupeBy]).toLowerCase() : null;
    if (key && seen.has(key)) {
      const first = seen.get(key).dst;
      for (const [k, v] of Object.entries(dst)) if (isEmpty(first[k]) && !isEmpty(v)) first[k] = v;
      return merged.push({ row, into: plan.dedupeBy + '=' + key });
    }
    const entry = { row, dst };
    if (key) seen.set(key, entry);
    staged.push(entry);
  });

  // Required-field check runs after merging so a sparse duplicate can complete its twin.
  for (const { row, dst } of staged) {
    const missing = (plan.required ?? []).filter((f) => isEmpty(dst[f]));
    if (missing.length) rejected.push({ row, reason: `missing required: ${missing.join(', ')}` });
    else out.push(dst);
  }

  return {
    records: out,
    rejected,
    warnings,
    merged,
    summary: { input: records.length, migrated: out.length, rejected: rejected.length, merged: merged.length, warnings: warnings.length },
  };
}

export function renderReport({ summary: s, rejected, warnings, merged }, limit = 10) {
  const pct = s.input ? Math.round((s.migrated / s.input) * 100) : 0;
  const L = [
    `Migration report`,
    `  input ${s.input} | migrated ${s.migrated} (${pct}%) | rejected ${s.rejected} | duplicates merged ${s.merged} | warnings ${s.warnings}`,
  ];
  const sect = (title, items, fmt) => {
    if (!items.length) return;
    L.push(`\n${title}`);
    items.slice(0, limit).forEach((x) => L.push('  - ' + fmt(x)));
    if (items.length > limit) L.push(`  ... and ${items.length - limit} more`);
  };
  sect('Rejected', rejected, (x) => `row ${x.row}: ${x.reason}`);
  sect('Merged duplicates', merged, (x) => `row ${x.row} -> ${x.into}`);
  sect('Warnings', warnings, (x) => `row ${x.row}: ${x.warning}`);
  return L.join('\n');
}

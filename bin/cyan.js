#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { SCHEMAS } from '../src/schemas.js';
import { buildPlan } from '../src/plan.js';
import { migrate, renderReport } from '../src/migrate.js';
import { parseCSV, toCSV } from '../src/csv.js';

const HELP = `cyan - CRM migration engine

  cyan crms                                        list supported CRMs/objects
  cyan map <from> <to> <object> [--out plan.json]  suggest a field mapping (editable plan)
  cyan run --in data.csv --plan plan.json [--out out.csv|out.json] [--dry-run] [--day-first]
`;

const { positionals: [cmd, ...rest], values: v } = parseArgs({
  allowPositionals: true,
  options: { out: { type: 'string' }, in: { type: 'string' }, plan: { type: 'string' }, 'dry-run': { type: 'boolean' }, 'day-first': { type: 'boolean' } },
});

try {
  if (cmd === 'crms') {
    for (const [crm, objs] of Object.entries(SCHEMAS)) console.log(`${crm}: ${Object.keys(objs).join(', ')}`);
  } else if (cmd === 'map') {
    const [from, to, object] = rest;
    const plan = buildPlan(from, to, object);
    console.log(`${from} -> ${to} (${object})`);
    for (const m of plan.mappings) console.log(`  ${m.from.padEnd(20)} -> ${m.to.padEnd(20)} ${String(m.confidence).padStart(4)}  ${m.type}`);
    if (plan.unmappedSource.length) console.log(`\nunmapped source fields: ${plan.unmappedSource.join(', ')}`);
    if (v.out) { writeFileSync(v.out, JSON.stringify(plan, null, 2)); console.log(`\nplan written to ${v.out}`); }
  } else if (cmd === 'run') {
    if (!v.in || !v.plan) throw new Error('--in and --plan are required');
    const plan = JSON.parse(readFileSync(v.plan, 'utf8'));
    if (v['day-first']) plan.options = { ...plan.options, dayFirst: true };
    const res = migrate(parseCSV(readFileSync(v.in, 'utf8')), plan);
    console.log(renderReport(res));
    if (v['dry-run']) console.log('\n(dry run: nothing written)');
    else if (v.out) {
      writeFileSync(v.out, v.out.endsWith('.json') ? JSON.stringify(res.records, null, 2) : toCSV(res.records));
      console.log(`\nwrote ${res.records.length} records to ${v.out}`);
    }
  } else console.log(HELP);
} catch (e) {
  console.error('error: ' + e.message);
  process.exit(1);
}

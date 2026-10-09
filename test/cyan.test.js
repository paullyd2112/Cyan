import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../src/transforms.js';
import { parseCSV, toCSV } from '../src/csv.js';
import { suggestMapping } from '../src/mapper.js';
import { buildPlan } from '../src/plan.js';
import { migrate } from '../src/migrate.js';

test('phone normalizes to E.164 and flags extensions', () => {
  assert.equal(T.phone('(415) 555-0134').value, '+14155550134');
  assert.equal(T.phone('1-415-555-0134').value, '+14155550134');
  assert.deepEqual(T.phone('+1 212 555 0199 x42'), { value: '+12125550199', warning: 'extension dropped' });
  assert.equal(T.phone('12345').value, null);
  assert.equal(T.phone('+44 20 7946 0958').value, '+442079460958');
});

test('date handles US, day-first, epoch, and impossible dates', () => {
  assert.equal(T.date('03/15/2024').value, '2024-03-15');
  assert.equal(T.date('15/03/2024').value, '2024-03-15'); // unambiguous, swapped with warning
  assert.equal(T.date('03/04/2024', { dayFirst: true }).value, '2024-04-03');
  assert.equal(T.date('1700000000').value, '2023-11-14T22:13:20.000Z');
  assert.equal(T.date('31/02/2024').value, null);
  assert.equal(T.date('2024-02-01').value, '2024-02-01');
});

test('email, number, url, picklist', () => {
  assert.equal(T.email('  ADA@X.io ').value, 'ada@x.io');
  assert.equal(T.email('nope').value, null);
  assert.equal(T.number('$1,250.50').value, 1250.5);
  assert.equal(T.number('(500)').value, -500);
  assert.equal(T.number('2.5M').value, 2_500_000);
  assert.equal(T.url('https://www.Kernel.org/').value, 'kernel.org');
  assert.equal(T.picklist('Lead', { valueMap: { lead: 'New' } }).value, 'New');
  assert.equal(T.picklist('x', { strict: true }).value, null);
});

test('csv round trips quotes, commas, newlines, BOM', () => {
  const rows = [{ a: 'x,y', b: 'say "hi"', c: 'l1\nl2' }];
  assert.deepEqual(parseCSV('﻿' + toCSV(rows)), rows);
  assert.deepEqual(parseCSV('a,b\r\n1,2\r\n'), [{ a: '1', b: '2' }]);
});

test('mapper handles synonyms, prefixes, and one-to-one assignment', () => {
  const m = Object.fromEntries(suggestMapping('hubspot', 'salesforce', 'contacts').mappings.map((x) => [x.from, x.to]));
  assert.equal(m.jobtitle, 'Title');
  assert.equal(m.company, 'Account.Name');
  assert.equal(m.city, 'MailingCity');
  assert.equal(m.phone, 'Phone');
  assert.equal(m.mobilephone, 'MobilePhone');
  const dsts = Object.values(m);
  assert.equal(new Set(dsts).size, dsts.length);
  const deals = Object.fromEntries(suggestMapping('pipedrive', 'hubspot', 'deals').mappings.map((x) => [x.from, x.to]));
  assert.equal(deals.title, 'dealname');
  assert.equal(deals.value, 'amount');
});

test('mapper rejects unknown CRMs', () => {
  assert.throws(() => suggestMapping('hubspot', 'nope', 'contacts'), /Unknown/);
});

test('migrate: rejects, merges duplicates (non-empty wins), warns', () => {
  const plan = buildPlan('hubspot', 'salesforce', 'contacts');
  const res = migrate(
    [
      { firstname: 'Ada', lastname: 'L', email: 'ADA@x.io', phone: '', mobilephone: '' },
      { firstname: '', lastname: '', email: 'ada@x.io', phone: '415-555-0134', mobilephone: '' },
      { firstname: 'No', lastname: '', email: 'n@x.io' },
      { firstname: 'Bad', lastname: 'Email', email: 'zzz' },
    ],
    plan,
  );
  assert.equal(res.summary.migrated, 2);
  assert.equal(res.summary.merged, 1);
  assert.equal(res.summary.rejected, 1);
  assert.equal(res.records[0].Phone, '+14155550134');
  assert.ok(res.warnings.some((w) => /invalid email/.test(w.warning)));
});

test('plan: pipedrive full name is split into first/last', () => {
  const plan = buildPlan('pipedrive', 'salesforce', 'contacts');
  const res = migrate([{ name: 'Grace Brewster Hopper', email: 'g@navy.mil' }], plan);
  assert.equal(res.records[0].FirstName, 'Grace Brewster');
  assert.equal(res.records[0].LastName, 'Hopper');
});

test('plan: first/last joined into pipedrive name', () => {
  const plan = buildPlan('hubspot', 'pipedrive', 'contacts');
  const res = migrate([{ firstname: 'Ada', lastname: 'Lovelace', email: 'a@x.io' }], plan);
  assert.equal(res.records[0].name, 'Ada Lovelace');
});

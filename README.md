# Cyan

A zero-dependency CRM migration engine (Node 20+). Built as the core of a white-label GTM migration tool for CRM consultants.

- **Auto field mapping** between HubSpot, Salesforce and Pipedrive (contacts, companies, deals) using synonyms, prefix stripping, fuzzy name match and type compatibility. Each mapping has a confidence score.
- **Editable plans**: `cyan map` emits a JSON plan a consultant can review and tweak (picklist `valueMap`s, required fields, dedupe key).
- **Transforms**: E.164 phones (extensions flagged), ISO dates (US / day-first / epoch), numbers (`$1.2M`, `(500)`), emails, URLs, picklists.
- **Safe runs**: validation, duplicate merge (non-empty wins), reject + warning report, `--dry-run`.

```sh
node bin/cyan.js crms
node bin/cyan.js map hubspot salesforce contacts --out plan.json
node bin/cyan.js run --in examples/hubspot-contacts.csv --plan plan.json --dry-run
node bin/cyan.js run --in examples/hubspot-contacts.csv --plan plan.json --out out.csv
npm test
```

## Layout
`src/schemas.js` CRM field catalogs and synonyms · `src/mapper.js` scoring · `src/plan.js` plan defaults (e.g. full-name split/join) · `src/transforms.js` · `src/migrate.js` runner and report · `src/csv.js`.

## Next ideas
Live API connectors, custom-field discovery, association/relationship migration (contact↔company↔deal), resumable batches, a white-label web UI.

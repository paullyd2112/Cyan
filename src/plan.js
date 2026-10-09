import { SCHEMAS } from './schemas.js';
import { suggestMapping } from './mapper.js';

// Build a runnable migration plan from a suggested mapping, with sensible per-object defaults.
export function buildPlan(srcCrm, dstCrm, object, opts = {}) {
  const sug = suggestMapping(srcCrm, dstCrm, object, opts);
  const dstSchema = SCHEMAS[dstCrm][object];
  const plan = {
    source: srcCrm, destination: dstCrm, object,
    mappings: sug.mappings,
    required: dstSchema.filter((d) => d.required).map((d) => d.name),
    options: {},
    unmappedSource: sug.unmappedSource,
  };
  const dstNames = new Set(dstSchema.map((d) => d.name));
  const srcNames = new Set(SCHEMAS[srcCrm][object].map((d) => d.name));
  if (object === 'contacts') {
    const emailField = dstSchema.find((d) => d.type === 'email')?.name;
    if (emailField) plan.dedupeBy = emailField;
    // Pipedrive stores one full name; derive it from / split it into first+last when the other side differs.
    if (dstNames.has('name') && srcNames.has('firstname')) plan.joinFullName = { first: 'firstname', last: 'lastname', to: 'name' };
    if (srcNames.has('name') && dstNames.has('firstname')) plan.splitFullName = { from: 'name', first: 'firstname', last: 'lastname' };
    if (srcNames.has('name') && dstNames.has('FirstName')) plan.splitFullName = { from: 'name', first: 'FirstName', last: 'LastName' };
  }
  return plan;
}

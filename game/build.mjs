// Inlines core.js into index.html so the game runs from a single file (file://, or as a hosted page).
import { readFileSync, writeFileSync } from 'node:fs';
const core = readFileSync(new URL('./core.js', import.meta.url), 'utf8').replace(/^export /gm, '');
let html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
html = html.replace(/import \{[^}]*\} from '\.\/core\.js';/, core).replace('<script type="module">', '<script>');
writeFileSync(new URL('./standalone.html', import.meta.url), html);
console.log('wrote standalone.html', html.length, 'bytes');

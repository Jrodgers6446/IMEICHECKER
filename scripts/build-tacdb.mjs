// Converts the Osmocom TAC database CSV export into the compact JSON the
// extension bundles. Usage: node scripts/build-tacdb.mjs <tacdb.csv> [out.json]
import { readFileSync, writeFileSync } from 'node:fs';

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// CSV columns: tac, brand, model, contributor, comment, model url, brand url, aka
export function buildDb(csv) {
  const rows = parseCsv(csv).filter((r) => /^\d{8}$/.test(r[0] ?? ''));
  const brands = [];
  const brandIndex = new Map();
  const tacs = {};
  for (const [tac, brand, model, , , modelUrl, , aka] of rows) {
    if (!brand.trim() || !model.trim()) continue;
    let b = brandIndex.get(brand);
    if (b === undefined) {
      b = brands.push(brand) - 1;
      brandIndex.set(brand, b);
    }
    const entry = [b, model.trim()];
    const alt = [...new Set((aka ?? '').split(',').map((s) => s.trim()).filter(Boolean))].filter((a) => a !== model.trim());
    const page = (modelUrl ?? '').trim().replace(/^https?:\/\/(www\.)?gsmarena\.com\//, '');
    const validPage = /^[\w.-]+\.php$/.test(page) ? page : null;
    if (alt.length || validPage) entry.push(alt);
    if (validPage) entry.push(validPage);
    tacs[tac] = entry;
  }
  return { brands, tacs };
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  const [input, output = 'data/tacdb.json'] = process.argv.slice(2);
  if (!input) {
    console.error('usage: node scripts/build-tacdb.mjs <tacdb.csv> [out.json]');
    process.exit(1);
  }
  const db = buildDb(readFileSync(input, 'utf8'));
  writeFileSync(output, JSON.stringify(db));
  console.log(`${Object.keys(db.tacs).length} TACs, ${db.brands.length} brands -> ${output}`);
}

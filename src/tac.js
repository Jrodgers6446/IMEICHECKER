const GSMARENA = 'https://www.gsmarena.com/';

let dbPromise;

export function loadTacDb() {
  dbPromise ??= fetch(new URL('../data/tacdb.json', import.meta.url)).then((r) => {
    if (!r.ok) throw new Error(`TAC database failed to load (${r.status})`);
    return r.json();
  });
  return dbPromise;
}

export function lookupTac(db, tac) {
  const entry = db.tacs[tac];
  if (!entry) return null;
  const [brandIndex, model, aliases = [], page] = entry;
  return {
    brand: db.brands[brandIndex],
    model,
    aliases,
    url: page ? GSMARENA + page : null,
  };
}

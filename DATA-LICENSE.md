# Data license: Osmocom TAC database

This note covers `data/tacdb.json` only. It is separate from the license that covers the code (see `LICENSE`).

`data/tacdb.json` is an adapted copy of the Osmocom TAC database, which is licensed under the Creative Commons Attribution-ShareAlike 3.0 Unported license (CC BY-SA 3.0). That license cannot be removed or replaced, and it applies to the data file and to any adaptation of it, whatever the license on the rest of this repository says.

- Source: http://tacdb.osmocom.org/
- Export used: http://tacdb.osmocom.org/export/tacdb.csv, retrieved 2026-11-18
- Credit: the Osmocom TAC database and its contributors. The export header reads "Osmocom TAC database under CC-BY-SA v3.0 (c) Harald Welte 2016".
- License text: https://creativecommons.org/licenses/by-sa/3.0/legalcode (summary: https://creativecommons.org/licenses/by-sa/3.0/)

## Changes made to the original

Done by `scripts/build-tacdb.mjs`:

- Converted from CSV to compact JSON: `{ brands: [...], tacs: { "<tac>": [brandIndex, model, aliases?, gsmarenaPath?] } }`.
- Dropped the contributor and comment columns, and rows without an 8-digit TAC, brand or model.
- Removed duplicate aliases and aliases equal to the model name.
- Reduced GSMArena links to a path on gsmarena.com and dropped any that did not match that shape.

## What this means for you

You may copy, redistribute and adapt `data/tacdb.json` under CC BY-SA 3.0: keep this credit, say what you changed, and share your adapted data under the same license. No warranty is given for the data.

None of this extends to the code. The source code, icons, documentation and tests are proprietary and all rights are reserved (see `LICENSE`).

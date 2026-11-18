# Attribution for `tacdb.json`

`tacdb.json` is derived from the **Osmocom TAC database**.

- Source: http://tacdb.osmocom.org/ (export: http://tacdb.osmocom.org/export/tacdb.csv, retrieved 2026-11-18)
- Copyright: the Osmocom TAC database and its contributors; the export header credits Harald Welte, 2016
- License: Creative Commons Attribution-ShareAlike 3.0 Unported, https://creativecommons.org/licenses/by-sa/3.0/

Changes made (`scripts/build-tacdb.mjs`):

- Converted from CSV to compact JSON: `{ brands: [...], tacs: { "<tac>": [brandIndex, model, aliases?, gsmarenaPath?] } }`.
- Dropped the contributor and comment columns, and rows without an 8-digit TAC, brand or model.
- Removed duplicate aliases and aliases equal to the model name.
- Reduced GSMArena links to a path on gsmarena.com and dropped any that did not match that shape.

Redistribute this file under the same license (CC BY-SA 3.0), keep this notice, and mark further changes.
The rest of the repository is MIT licensed.

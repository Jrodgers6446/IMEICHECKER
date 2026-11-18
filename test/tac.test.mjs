import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsv, buildDb } from '../scripts/build-tacdb.mjs';
import { lookupTac } from '../src/tac.js';

const bundled = JSON.parse(readFileSync(new URL('../data/tacdb.json', import.meta.url), 'utf8'));

test('parseCsv handles quotes, commas and CRLF', () => {
  const rows = parseCsv('a,"b,c","say ""hi"""\r\nd,,e\n');
  assert.deepEqual(rows, [['a', 'b,c', 'say "hi"'], ['d', '', 'e']]);
});

const SAMPLE = [
  'Osmocom TAC database under CC-BY-SA v3.0 (c) Harald Welte 2016',
  'tac,name,name,contributor,comment,gsmarena,gsmarena,aka',
  '01194800,Apple,iPhone 3GS,,,http://www.gsmarena.com/apple_iphone_3gs-2826.php,http://www.gsmarena.com/apple-phones-48.php,"iPhone 3GS 16GB,iPhone 3GS 32GB"',
  '35060680,Nokia,3310,OsmoDevCon 2014,,,,',
  '35675904,Oppo,N1,Someone,,,,',
  '3567,Broken,Short TAC,,,,,',
  '35000000,,No brand,,,,,',
].join('\n');

test('buildDb keeps only complete 8-digit rows and shares brand names', () => {
  const db = buildDb(SAMPLE);
  assert.deepEqual(Object.keys(db.tacs).sort(), ['01194800', '35060680', '35675904']);
  assert.deepEqual(db.brands, ['Apple', 'Nokia', 'Oppo']);
});

test('lookupTac returns brand, model, aliases and a GSMArena link', () => {
  const db = buildDb(SAMPLE);
  assert.deepEqual(lookupTac(db, '01194800'), {
    brand: 'Apple',
    model: 'iPhone 3GS',
    aliases: ['iPhone 3GS 16GB', 'iPhone 3GS 32GB'],
    url: 'https://www.gsmarena.com/apple_iphone_3gs-2826.php',
  });
  assert.deepEqual(lookupTac(db, '35060680'), { brand: 'Nokia', model: '3310', aliases: [], url: null });
  assert.equal(lookupTac(db, '99999999'), null);
});

test('bundled database matches known Osmocom entries', () => {
  assert.ok(Object.keys(bundled.tacs).length > 20000);
  assert.deepEqual(lookupTac(bundled, '35675904')?.brand, 'Oppo');
  assert.equal(lookupTac(bundled, '35675904')?.model, 'N1');
  const iphone = lookupTac(bundled, '01194800');
  assert.equal(iphone.brand, 'Apple');
  assert.equal(iphone.model, 'iPhone 3GS');
  assert.ok(iphone.url.startsWith('https://www.gsmarena.com/'));
});

test('every bundled TAC is 8 digits and points at a real brand', () => {
  for (const [tac, [brandIndex, model]] of Object.entries(bundled.tacs)) {
    assert.match(tac, /^\d{8}$/);
    assert.ok(bundled.brands[brandIndex], tac);
    assert.ok(model, tac);
  }
});

test('buildDb normalizes GSMArena links and drops anything else', () => {
  const db = buildDb(
    [
      'tac,a,b,c,d,e,f,g',
      '35000001,A,One,,,https://www.gsmarena.com/a_one-1.php,,',
      '35000002,A,Two,,,http://www.gsmarena.com/a_two-2.php,,',
      '35000003,A,Three,,,javascript:alert(1),,',
    ].join('\n'),
  );
  assert.equal(lookupTac(db, '35000001').url, 'https://www.gsmarena.com/a_one-1.php');
  assert.equal(lookupTac(db, '35000002').url, 'https://www.gsmarena.com/a_two-2.php');
  assert.equal(lookupTac(db, '35000003').url, null);
});

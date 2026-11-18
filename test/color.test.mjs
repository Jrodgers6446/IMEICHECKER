import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colorSwatch } from '../src/colors.js';
import { isave, normalize } from '../src/providers/isave.js';
import { providers, getProvider } from '../src/providers/index.js';
import { lookupImei } from '../src/lookup.js';
import { buildDb } from '../scripts/build-tacdb.mjs';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

test('colorSwatch maps known names, ignoring case and extras', () => {
  assert.match(colorSwatch('Pacific Blue'), /^#[0-9a-f]{6}$/);
  assert.equal(colorSwatch('SPACE GRAY'), colorSwatch('space grey'));
  assert.equal(colorSwatch('Midnight Black 256GB'), colorSwatch('midnight black'));
  assert.equal(colorSwatch('Cosmic Black'), colorSwatch('black'));
  assert.equal(colorSwatch('Rose Gold'), colorSwatch('rose gold'));
  assert.notEqual(colorSwatch('Rose Gold'), colorSwatch('Gold'));
  assert.equal(colorSwatch('(PRODUCT)RED'), colorSwatch('red'));
});

test('colorSwatch returns null for unknown or empty names', () => {
  assert.equal(colorSwatch('Prismatic Unobtainium'), null);
  assert.equal(colorSwatch(''), null);
  assert.equal(colorSwatch(null), null);
});

test('isave posts the documented request with the key in X-Api-Key', async () => {
  let seen;
  const fetchFn = async (url, init) => {
    seen = { url, init };
    return json({ success: true, request_id: 'isk_1', credits: 1, object: { model: 'iPhone 13', color: 'Pacific Blue', capacity: '128GB' } });
  };
  const out = await isave.lookup('353893101224013', 'isk_live_secret', fetchFn);
  assert.equal(seen.url, 'https://api.imeigsx.com/api/v1/check');
  assert.equal(seen.init.method, 'POST');
  assert.equal(seen.init.headers['X-API-Key'], 'isk_live_secret');
  assert.deepEqual(JSON.parse(seen.init.body), { command: '81', identifier: '353893101224013' });
  assert.ok(!seen.url.includes('secret'));
  assert.equal(out.color, 'Pacific Blue');
  assert.deepEqual(out.fields, [
    { label: 'Name', value: 'iPhone 13' },
    { label: 'Storage', value: '128GB' },
  ]);
});

test('isave accepts the documented colour spellings and falls back to the text result', () => {
  assert.equal(normalize({ object: { colour: 'Sierra Blue' } }).color, 'Sierra Blue');
  assert.equal(normalize({ object: { deviceColor: 'Black' } }).color, 'Black');
  assert.equal(normalize({ object: { color: '  ' }, result: 'Model: iPhone 12\nColour: Purple\nCapacity: 64GB' }).color, 'Purple');
  assert.equal(normalize({ object: { model: 'iPhone 12' } }).color, null);
  assert.equal(normalize({}).color, null);
});

test('isave turns documented errors into readable messages', async () => {
  const fail = (status, message) => async () => json({ success: false, message }, status);
  await assert.rejects(isave.lookup('1', 'k', fail(401, 'Invalid API Key')), /rejected the API key/);
  await assert.rejects(isave.lookup('1', 'k', fail(402, 'Insufficient funds')), /balance/);
  await assert.rejects(isave.lookup('1', 'k', fail(400, 'Model not supported')), /Model not supported/);
  await assert.rejects(isave.lookup('1', 'k', async () => json({ success: false, message: 'Nope' }, 200)), /Nope/);
  await assert.rejects(isave.lookup('1', 'k', async () => new Response('x', { status: 500 })), /HTTP 500/);
});

test('exactly one provider returns color and every provider declares it', () => {
  assert.ok(providers.every((p) => typeof p.returnsColor === 'boolean'));
  assert.deepEqual(providers.filter((p) => p.returnsColor).map((p) => p.id), ['isave']);
  assert.equal(getProvider('imeidb').returnsColor, false);
});

test('lookupImei passes the provider color through and stays offline without a key', async () => {
  const db = buildDb('tac,a,b,c,d,e,f,g\n35389310,Apple,iPhone 11 Pro Max,,,,,\n');
  const parsed = { imei: '353893101224013', tac: '35389310' };
  const settings = { providerId: 'isave', apiKeys: { isave: 'k' }, onlineLookup: true };
  const fetchFn = async () => json({ success: true, object: { color: 'Midnight Green' } });
  const r = await lookupImei(parsed, { db, settings, fetchFn });
  assert.equal(r.remote.color, 'Midnight Green');
  assert.equal(r.local.brand, 'Apple');

  const offline = await lookupImei(parsed, { db, settings: { ...settings, apiKeys: {} }, fetchFn: () => assert.fail('network') });
  assert.equal(offline.remote, null);
  assert.equal(offline.local.model, 'iPhone 11 Pro Max');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { imeidb, normalize } from '../src/providers/imeidb.js';
import { lookupImei } from '../src/lookup.js';
import { buildDb } from '../scripts/build-tacdb.mjs';

// Example response copied from https://imeidb.xyz/api
const DOC_EXAMPLE = {
  success: true,
  query: 353893101224013,
  data: {
    tac: 35389310,
    serial: 122401,
    controlNumber: 3,
    valid: true,
    device_id: 9846,
    device_image: 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-11-pro.jpg',
    device_spec: {
      sim_slots: 1,
      os: 'iOS 13',
      aliases: ['A2218', 'A2161', 'A2220'],
      nfc: true,
      nettech: ['GSM', 'CDMA', 'HSPA', 'EVDO', 'LTE'],
    },
    name: 'Apple iPhone 11 Pro Max',
    brand: 'Apple',
    model: 'iPhone 11 Pro Max',
    manufacturer: 'Apple Inc',
    type: 'Smartphone',
    blacklist: { status: false },
  },
};

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });

test('imeidb normalize maps the documented response', () => {
  const out = normalize(DOC_EXAMPLE);
  const byLabel = Object.fromEntries(out.fields.map((f) => [f.label, f.value]));
  assert.equal(byLabel.Name, 'Apple iPhone 11 Pro Max');
  assert.equal(byLabel.Manufacturer, 'Apple Inc');
  assert.equal(byLabel['Device type'], 'Smartphone');
  assert.equal(byLabel['Model numbers'], 'A2218, A2161, A2220');
  assert.equal(byLabel.NFC, 'Yes');
  assert.deepEqual(out.status, { label: 'Blacklist', value: 'Clean', level: 'good' });
  assert.equal(out.color, null);
});

test('imeidb documents no color field, so it never reports one', () => {
  const withNoise = structuredClone(DOC_EXAMPLE);
  withNoise.data.color = 'Red';
  assert.equal(normalize(withNoise).color, null);
  assert.equal(imeidb.returnsColor, false);
});

test('imeidb flags blacklisted devices and skips missing fields', () => {
  const out = normalize({ success: true, data: { name: 'X', blacklist: { status: true } } });
  assert.deepEqual(out.fields, [{ label: 'Name', value: 'X' }]);
  assert.equal(out.status.level, 'bad');
  assert.equal(normalize({ success: true, data: {} }).status, null);
});

test('imeidb sends the key in X-Api-Key and never in the URL', async () => {
  let seen;
  const fetchFn = async (url, init) => {
    seen = { url, init };
    return jsonResponse(DOC_EXAMPLE);
  };
  await imeidb.lookup('353893101224013', 'secret-key', fetchFn);
  assert.equal(seen.url, 'https://imeidb.xyz/api/imei/353893101224013');
  assert.equal(seen.init.headers['X-Api-Key'], 'secret-key');
  assert.ok(!seen.url.includes('secret-key'));
});

test('imeidb turns documented error codes into readable messages', async () => {
  const fail = (code) => async () => jsonResponse({ success: false, message: 'nope', code }, code);
  await assert.rejects(imeidb.lookup('1', 'k', fail(401)), /rejected the API key/);
  await assert.rejects(imeidb.lookup('1', 'k', fail(402)), /balance/);
  await assert.rejects(imeidb.lookup('1', 'k', fail(429)), /rate limit/);
  await assert.rejects(imeidb.lookup('1', 'k', fail(460)), /invalid/);
  await assert.rejects(imeidb.lookup('1', 'k', async () => new Response('<html>', { status: 502 })), /HTTP 502/);
});

const db = buildDb('tac,a,b,c,d,e,f,g\n35389310,Apple,iPhone 11 Pro Max,,,,,\n');
const parsed = { imei: '353893101224013', tac: '35389310' };
const base = { providerId: 'imeidb', apiKeys: { imeidb: 'k' }, onlineLookup: true };

test('lookupImei stays offline unless online lookup is enabled with a key', async () => {
  const fetchFn = async () => assert.fail('must not call the network');
  for (const settings of [
    { ...base, onlineLookup: false },
    { ...base, apiKeys: {} },
  ]) {
    const r = await lookupImei(parsed, { db, settings, fetchFn });
    assert.equal(r.local.brand, 'Apple');
    assert.equal(r.remote, null);
    assert.equal(r.remoteError, null);
  }
});

test('lookupImei merges local and remote results', async () => {
  const r = await lookupImei(parsed, { db, settings: base, fetchFn: async () => jsonResponse(DOC_EXAMPLE) });
  assert.equal(r.local.model, 'iPhone 11 Pro Max');
  assert.equal(r.remote.status.value, 'Clean');
  assert.equal(r.providerName, 'ImeiDB');
});

test('lookupImei keeps the offline result when the provider fails', async () => {
  const bad = await lookupImei(parsed, {
    db,
    settings: base,
    fetchFn: async () => jsonResponse({ success: false, message: 'x', code: 401 }, 401),
  });
  assert.equal(bad.local.brand, 'Apple');
  assert.match(bad.remoteError, /rejected the API key/);

  const offline = await lookupImei(parsed, {
    db,
    settings: base,
    fetchFn: async () => {
      throw new TypeError('Failed to fetch');
    },
  });
  assert.match(offline.remoteError, /Could not reach ImeiDB/);
});

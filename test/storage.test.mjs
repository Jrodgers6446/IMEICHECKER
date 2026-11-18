import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getSettings, saveSettings, getHistory, addHistory, clearHistory } from '../src/storage.js';

let data;

beforeEach(() => {
  data = {};
  globalThis.chrome = {
    storage: {
      local: {
        get: async (key) => (key in data ? { [key]: data[key] } : {}),
        set: async (items) => Object.assign(data, items),
        remove: async (key) => delete data[key],
      },
    },
  };
});

test('settings default to offline-only with history on', async () => {
  const s = await getSettings();
  assert.equal(s.onlineLookup, false);
  assert.equal(s.saveHistory, true);
  assert.deepEqual(s.apiKeys, {});
});

test('settings round-trip and keep the key out of other storage areas', async () => {
  await saveSettings({ providerId: 'imeidb', apiKeys: { imeidb: 'abc' }, onlineLookup: true });
  const s = await getSettings();
  assert.equal(s.apiKeys.imeidb, 'abc');
  assert.deepEqual(Object.keys(data), ['settings']);
});

test('history is newest first, de-duplicated and capped at 10', async () => {
  for (let i = 0; i < 25; i++) await addHistory({ imei: String(i).padStart(15, '0'), name: null });
  await addHistory({ imei: '000000000000024', name: 'Again' });
  const history = await getHistory();
  assert.equal(history.length, 10);
  assert.equal(history[0].imei, '000000000000024');
  assert.equal(history[0].name, 'Again');
  assert.equal(history.filter((h) => h.imei === '000000000000024').length, 1);
});

test('clearHistory removes everything', async () => {
  await addHistory({ imei: '490154203237518', name: 'x' });
  await clearHistory();
  assert.deepEqual(await getHistory(), []);
});

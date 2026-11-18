import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'));
const exists = (path) => existsSync(new URL(path, root));

test('manifest is MV3 with the required fields', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.match(manifest.version, /^\d+(\.\d+){0,3}$/);
  assert.ok(manifest.name.length <= 75);
  assert.ok(manifest.description.length <= 132);
});

test('every file the manifest points at exists', () => {
  const files = [
    ...Object.values(manifest.icons),
    ...Object.values(manifest.action.default_icon),
    manifest.action.default_popup,
    manifest.options_ui.page,
    manifest.background.service_worker,
  ];
  for (const file of files) assert.ok(exists(file), file);
});

test('permissions stay minimal and hosts are optional', () => {
  assert.deepEqual([...manifest.permissions].sort(), ['contextMenus', 'storage']);
  assert.equal(manifest.host_permissions, undefined);
  assert.deepEqual(manifest.optional_host_permissions, ['https://imeidb.xyz/*']);
  assert.equal(manifest.content_scripts, undefined);
  assert.equal(manifest.content_security_policy, undefined);
});

test('pages load only local scripts and styles', () => {
  for (const page of [manifest.action.default_popup, manifest.options_ui.page]) {
    const html = readFileSync(new URL(page, root), 'utf8');
    assert.ok(!/<script(?![^>]*\bsrc=)/i.test(html), `${page} has an inline script`);
    assert.ok(!/(src|href)="https?:/i.test(html), `${page} loads a remote resource`);
  }
});

test('no source file ships hardcoded API keys or remote code', () => {
  for (const file of ['src/popup/popup.js', 'src/options/options.js', 'src/background.js', 'src/storage.js']) {
    const code = readFileSync(new URL(file, root), 'utf8');
    assert.ok(!/\beval\(|new Function\(|import\(\s*['"]https?:/.test(code), file);
  }
});

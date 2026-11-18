import { cleanInput, parseImei, formatImei, reportingBody } from '../imei.js';
import { loadTacDb } from '../tac.js';
import { lookupImei } from '../lookup.js';
import { getProvider } from '../providers/index.js';
import { getSettings, saveSettings, getHistory, addHistory, clearHistory } from '../storage.js';

const $ = (id) => document.getElementById(id);
const input = $('imei');
const counter = $('counter');
const hint = $('hint');
const errorBox = $('error');
const result = $('result');

let db;
let settings;
let runId = 0;

function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  node.append(...children.filter((c) => c !== null && c !== undefined && c !== false));
  return node;
}

const COPY_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>';
const CHECK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

function copyButton(text, what) {
  const btn = h('button', { class: 'copy', type: 'button', 'aria-label': `Copy ${what}`, title: `Copy ${what}` });
  btn.innerHTML = COPY_ICON;
  btn.addEventListener('click', () => copy(text, btn, COPY_ICON));
  return btn;
}

async function copy(text, btn, idleIcon) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    return;
  }
  btn.classList.add('done');
  btn.innerHTML = CHECK_ICON + (btn.dataset.label ? `<span>Copied</span>` : '');
  setTimeout(() => {
    btn.classList.remove('done');
    btn.innerHTML = idleIcon + (btn.dataset.label ? `<span>${btn.dataset.label}</span>` : '');
  }, 1200);
}

function row(label, value, { mono = false, copyable = true } = {}) {
  return h(
    'div',
    { class: 'row' },
    h('dt', {}, label),
    h('dd', { class: mono ? 'mono' : '' }, value),
    copyable ? copyButton(value, label.toLowerCase()) : h('span'),
  );
}

function setCounter(length) {
  counter.textContent = `${length}/15`;
}

function showError(message) {
  input.setAttribute('aria-invalid', 'true');
  errorBox.textContent = message;
  errorBox.hidden = false;
  hint.hidden = true;
  result.replaceChildren();
}

const defaultHint = hint.textContent;

function clearError() {
  input.removeAttribute('aria-invalid');
  errorBox.hidden = true;
  hint.hidden = false;
  hint.textContent = defaultHint;
}

function reset(hintText) {
  runId++;
  clearError();
  result.replaceChildren();
  if (hintText) hint.textContent = hintText;
}

function evaluate(raw, { submit = false } = {}) {
  const digits = cleanInput(raw);
  setCounter(/\D/.test(digits) ? digits.replace(/\D/g, '').length : digits.length);

  if (!digits) return reset();

  const tooLong = digits.length > 15;
  const badChars = /\D/.test(digits);
  if (badChars || tooLong || digits.length === 15 || (submit && digits.length >= 1)) {
    const parsed = parseImei(digits);
    if (!parsed.ok) return showError(parsed.error);
    clearError();
    return run(parsed);
  }

  if (digits.length === 14) return reset('14 digits. Press Enter to add the check digit and look it up.');
  reset();
}

function deviceTitle(local) {
  if (!local) return 'Unknown device';
  const brand = local.brand;
  return local.model.toLowerCase().startsWith(brand.toLowerCase()) ? local.model : `${brand} ${local.model}`;
}

async function run(parsed) {
  const id = ++runId;
  const { local } = await lookupImei(parsed, { db, settings: { ...settings, onlineLookup: false }, fetchFn: fetch });
  if (id !== runId) return;

  const title = h('h2', { class: 'device-name' }, deviceTitle(local));
  const onlineSlot = h('div');
  const rows = [row('IMEI', formatImei(parsed.imei), { mono: true })];
  if (local) {
    rows.push(row('Brand', local.brand), row('Model', local.model));
    if (local.aliases.length) rows.push(row('Also known as', local.aliases.join(', ')));
  }
  rows.push(
    row('TAC', parsed.tac, { mono: true }),
    row('Serial (SNR)', parsed.serial, { mono: true }),
    row('Check digit', parsed.checkDigit, { mono: true }),
  );
  const body = reportingBody(parsed.tac);
  if (body) rows.push(row('Allocated by', body));

  const chips = h('div', { class: 'chips' }, h('span', { class: 'chip good' }, 'Valid IMEI'));
  if (parsed.calculated) chips.append(h('span', { class: 'chip' }, 'Check digit calculated'));
  if (!local) chips.append(h('span', { class: 'chip warn' }, 'Not in offline database'));

  const copyAll = h('button', { class: 'copy', type: 'button', 'data-label': 'Copy all' });
  copyAll.innerHTML = `${COPY_ICON}<span>Copy all</span>`;
  copyAll.addEventListener('click', () => copy(bubbleText(title, bubble), copyAll, COPY_ICON));

  const footer = h(
    'div',
    { class: 'bubble-foot' },
    h('p', { class: 'source' }, local ? 'Source: Osmocom TAC database (bundled, offline)' : 'Source: bundled offline database'),
    h(
      'div',
      { class: 'foot-actions' },
      local?.url ? h('a', { href: local.url, target: '_blank', rel: 'noreferrer noopener' }, 'Specs on GSMArena') : h('span'),
      copyAll,
    ),
  );

  const bubble = h('article', { class: 'bubble' }, h('div', { class: 'bubble-head' }, h('div', {}, title, chips)), h('dl', { class: 'rows' }, ...rows), onlineSlot, footer);
  result.replaceChildren(bubble);

  if (!local) {
    const online = settings.onlineLookup && settings.apiKeys[settings.providerId];
    bubble.insertBefore(
      h(
        'p',
        { class: 'note' },
        `No match for TAC ${parsed.tac}. The bundled database holds about ${Object.keys(db.tacs).length.toLocaleString()} mostly older models.`,
        online ? '' : ' Add an API key in settings for richer results.',
      ),
      onlineSlot,
    );
  }

  const entryName = local ? deviceTitle(local) : null;
  if (settings.saveHistory) {
    await addHistory({ imei: parsed.imei, name: entryName });
    renderHistory();
  }

  await runOnline(parsed, id, { local, title, onlineSlot, entryName });
}

async function runOnline(parsed, id, { local, title, onlineSlot, entryName }) {
  const provider = getProvider(settings.providerId);
  if (!settings.onlineLookup || !provider || !settings.apiKeys[provider.id]) return;

  if (!(await chrome.permissions.contains({ origins: [provider.hostPermission] }))) {
    onlineSlot.replaceChildren(h('p', { class: 'note bad' }, `Access to ${provider.name} was not granted. Open settings and save your key again.`));
    return;
  }

  onlineSlot.replaceChildren(h('p', { class: 'note' }, h('span', { class: 'spinner' }), `Asking ${provider.name}...`));
  const { remote, remoteError } = await lookupImei(parsed, { db, settings, fetchFn: fetch });
  if (id !== runId) return;

  if (remoteError) {
    onlineSlot.replaceChildren(h('p', { class: 'note bad' }, remoteError));
    return;
  }

  const rows = remote.fields.map((f) => row(f.label, f.value));
  onlineSlot.replaceChildren(
    h('h3', { class: 'section-title' }, `Online: ${provider.name}`),
    remote.status ? h('div', { class: 'chips' }, h('span', { class: `chip status ${remote.status.level}` }, `${remote.status.label}: ${remote.status.value}`)) : null,
    h('dl', { class: 'rows' }, ...rows),
  );

  const name = remote.fields.find((f) => f.label === 'Name')?.value;
  if (!local && name) {
    title.textContent = name;
    if (settings.saveHistory) {
      await addHistory({ imei: parsed.imei, name });
      renderHistory();
    }
  }
}

function bubbleText(title, bubble) {
  const lines = [title.textContent];
  for (const r of bubble.querySelectorAll('.row')) {
    lines.push(`${r.querySelector('dt').textContent}: ${r.querySelector('dd').textContent}`);
  }
  for (const chip of bubble.querySelectorAll('.chip.status')) lines.push(chip.textContent);
  return lines.join('\n');
}

async function renderHistory() {
  const history = await getHistory();
  $('history-section').hidden = history.length === 0;
  $('history').replaceChildren(
    ...history.map((entry) =>
      h(
        'li',
        {},
        h(
          'button',
          {
            class: 'history-item',
            type: 'button',
            onclick: () => {
              input.value = formatImei(entry.imei);
              evaluate(entry.imei, { submit: true });
              input.focus();
            },
          },
          h('span', { class: 'imei' }, formatImei(entry.imei)),
          h('span', { class: 'label' }, entry.name ?? 'Unknown device'),
        ),
      ),
    ),
  );
}

function effectiveTheme() {
  const set = document.documentElement.dataset.theme;
  if (set) return set;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
  $('theme').setAttribute('aria-label', effectiveTheme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
}

async function init() {
  [db, settings] = await Promise.all([loadTacDb(), getSettings()]);
  applyTheme(settings.theme);
  renderHistory();

  input.addEventListener('input', () => evaluate(input.value));
  $('form').addEventListener('submit', (e) => {
    e.preventDefault();
    evaluate(input.value, { submit: true });
  });
  $('settings').addEventListener('click', () => chrome.runtime.openOptionsPage());
  $('theme').addEventListener('click', async () => {
    settings.theme = effectiveTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(settings.theme);
    await saveSettings(settings);
  });
  $('clear-history').addEventListener('click', async () => {
    await clearHistory();
    renderHistory();
    input.focus();
  });

  const { pendingQuery } = await chrome.storage.session.get('pendingQuery');
  if (pendingQuery) {
    await chrome.storage.session.remove('pendingQuery');
    input.value = pendingQuery;
    evaluate(pendingQuery, { submit: true });
  }
}

init();

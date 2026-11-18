import { providers, getProvider } from '../providers/index.js';
import { getSettings, saveSettings, clearHistory } from '../storage.js';

const $ = (id) => document.getElementById(id);
const status = $('status');
let settings;

function say(message, isError = false) {
  status.textContent = message;
  status.classList.toggle('error', isError);
}

function renderProvider() {
  const provider = getProvider($('provider').value);
  const hasKey = Boolean(settings.apiKeys[provider.id]);
  const info = $('provider-info');
  info.replaceChildren(
    `Provides: ${provider.provides}. `,
    Object.assign(document.createElement('a'), { href: provider.docsUrl, target: '_blank', rel: 'noreferrer noopener', textContent: 'API docs' }),
    ' · ',
    Object.assign(document.createElement('a'), { href: provider.signupUrl, target: '_blank', rel: 'noreferrer noopener', textContent: 'Get a key' }),
  );
  $('key').value = '';
  $('key').placeholder = hasKey ? 'A key is saved. Type to replace it.' : 'Paste your API key';
  $('key-note').textContent = hasKey
    ? 'Stored in this browser only (chrome.storage.local). It is never synced.'
    : 'Stored in this browser only (chrome.storage.local) once you save.';
  $('remove-key').hidden = !hasKey;
}

async function init() {
  settings = await getSettings();
  if (settings.theme) document.documentElement.dataset.theme = settings.theme;
  for (const p of providers) $('provider').append(new Option(p.name, p.id, false, p.id === settings.providerId));
  $('online').checked = settings.onlineLookup;
  $('history').checked = settings.saveHistory;
  renderProvider();

  $('provider').addEventListener('change', renderProvider);

  $('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const provider = getProvider($('provider').value);
    const newKey = $('key').value.trim();
    const key = newKey || settings.apiKeys[provider.id];
    const wantsOnline = $('online').checked;

    if (wantsOnline && !key) return say('Enter an API key to use online lookup.', true);

    // Must run straight from the click, before any other await, to count as a user gesture.
    if (wantsOnline) {
      const granted = await chrome.permissions.request({ origins: [provider.hostPermission] });
      if (!granted) return say(`Chrome needs your OK to contact ${provider.name}. Nothing was saved.`, true);
    }

    settings = {
      ...settings,
      providerId: provider.id,
      onlineLookup: wantsOnline,
      saveHistory: $('history').checked,
      apiKeys: { ...settings.apiKeys, ...(key ? { [provider.id]: key } : {}) },
    };
    await saveSettings(settings);
    renderProvider();
    say('Saved.');
  });

  $('remove-key').addEventListener('click', async () => {
    const id = $('provider').value;
    const { [id]: _removed, ...rest } = settings.apiKeys;
    settings = { ...settings, apiKeys: rest, onlineLookup: false };
    $('online').checked = false;
    await saveSettings(settings);
    renderProvider();
    say('Key removed.');
  });

  $('clear-history').addEventListener('click', async () => {
    await clearHistory();
    say('History cleared.');
  });
}

init();

const HISTORY_LIMIT = 10;

const defaults = { providerId: 'imeidb', apiKeys: {}, onlineLookup: false, saveHistory: true };

const area = () => globalThis.chrome.storage.local;

export async function getSettings() {
  const { settings } = await area().get('settings');
  return { ...defaults, ...settings, apiKeys: { ...settings?.apiKeys } };
}

export async function saveSettings(settings) {
  await area().set({ settings });
}

export async function getHistory() {
  const { history } = await area().get('history');
  return history ?? [];
}

export async function addHistory(entry) {
  const history = (await getHistory()).filter((h) => h.imei !== entry.imei);
  history.unshift({ ...entry, at: Date.now() });
  await area().set({ history: history.slice(0, HISTORY_LIMIT) });
}

export async function clearHistory() {
  await area().remove('history');
}

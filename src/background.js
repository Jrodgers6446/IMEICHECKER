import { findImei } from './imei.js';

const MENU_ID = 'check-imei';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: 'Check IMEI',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== MENU_ID) return;
  const selected = info.selectionText ?? '';
  const query = findImei(selected) ?? selected.trim().slice(0, 40);
  await chrome.storage.session.set({ pendingQuery: query });
  try {
    await chrome.action.openPopup();
  } catch {
    chrome.windows.create({
      url: chrome.runtime.getURL('src/popup/popup.html'),
      type: 'popup',
      width: 440,
      height: 680,
    });
  }
});

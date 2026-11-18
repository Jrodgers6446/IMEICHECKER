# Privacy

IMEI Checker does not collect, sell or share any data. There is no analytics, no telemetry and no account.

**Stays on your device**

- The IMEI you type is checked and looked up in a database bundled with the extension. No network request is made for that.
- Recent lookups (up to 10 IMEIs and the device name) are saved in `chrome.storage.local`. You can clear them from the popup or the settings page, or turn history off in settings.
- Your settings and optional API key are saved in `chrome.storage.local`. They are not synced to your Google account.
- The "Check IMEI" context-menu item only reads the text you selected when you click it. The extension has no content scripts and cannot read pages.

**Only if you turn it on**

If you enable online lookup and save your own API key, each IMEI you check is sent to the provider you chose (currently ImeiDB, `imeidb.xyz`) together with your key. That provider's terms and privacy policy apply to what it does with it. Chrome asks for permission to contact the provider the first time.

**Never**

The extension loads no remote code, uses no third-party scripts, fonts or trackers, and does not send data to its author.

Removing the extension deletes everything it stored.

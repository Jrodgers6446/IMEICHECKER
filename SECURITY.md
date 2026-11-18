# Security

## Reporting a vulnerability

Please do not open a public issue for a security problem. Use the repository's private vulnerability reporting instead: open the **Security** tab and choose **Report a vulnerability**. Include what you found, how to reproduce it, and which version or commit you tested.

You can expect an acknowledgement of your report, a follow-up once it is reproduced, and a note when a fix is released. Please give a reasonable time to fix an issue before discussing it publicly.

## Scope

In scope: the extension code in this repository, including how it stores settings and API keys, how it handles selected text, and the requests it makes to the online providers.

Out of scope: the third-party services themselves (ImeiDB, iSave), the Osmocom data, and issues that need a modified copy of the extension or a compromised browser profile.

## How the extension limits its exposure

- Permissions are `storage` and `contextMenus`. Provider hosts are optional permissions that Chrome asks for when you enable online lookup.
- No content scripts, so it cannot read the pages you visit. The context menu only receives the text you select when you click it.
- No remote code, analytics or tracking. All scripts and styles are bundled; pages use Chrome's default extension content security policy.
- API keys are stored in `chrome.storage.local` only, sent only in a request header to the provider you selected, and never put in a URL or logged.
- Page content is built with DOM methods and `textContent`, not by inserting provider or dataset text as HTML.

## Keys and secrets

No API keys or credentials are committed to this repository, and none should be. If you find one, report it as described above.

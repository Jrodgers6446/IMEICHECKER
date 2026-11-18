const ENDPOINT = 'https://api.imeigsx.com/api/v1/check';

// Instant Check 81 is "Model + Color + Storage" for Apple devices ($0.02 per check at time of writing).
const COMMAND = '81';

const ERRORS = {
  401: 'iSave rejected the API key.',
  402: 'Your iSave balance is too low for this check.',
  403: 'iSave blocked this request: the key is restricted to other IP addresses.',
  404: 'iSave does not offer this check any more.',
};

const first = (obj, keys) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
};

// Field names (`color`, `colour`, `capacity`, ...) come from the field reference at https://imeigsx.com/api_documentation
export function normalize(body) {
  const o = body.object ?? {};
  const text = typeof body.result === 'string' ? body.result : '';
  const color = first(o, ['color', 'colour', 'deviceColor']) ?? text.match(/colou?r\s*:\s*([^\n\r]+)/i)?.[1]?.trim() ?? null;
  const capacity = first(o, ['capacity']) ?? text.match(/(?:capacity|storage)\s*:\s*([^\n\r]+)/i)?.[1]?.trim() ?? null;
  const model = first(o, ['model', 'apple/modelName', 'modelName']) ?? text.match(/model\s*:\s*([^\n\r]+)/i)?.[1]?.trim() ?? null;

  const fields = [];
  if (model) fields.push({ label: 'Name', value: model });
  if (capacity) fields.push({ label: 'Storage', value: capacity });
  return { fields, status: null, color };
}

export const isave = {
  id: 'isave',
  name: 'iSave',
  docsUrl: 'https://imeigsx.com/api_documentation',
  signupUrl: 'https://imeigsx.com/',
  hostPermission: 'https://api.imeigsx.com/*',
  provides: 'device color and storage, Apple devices only (pay per check, about $0.02)',
  returnsColor: true,
  colorNote: 'iSave reports color for Apple devices only.',

  async lookup(imei, apiKey, fetchFn = fetch) {
    const res = await fetchFn(ENDPOINT, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ command: COMMAND, identifier: imei }),
    });
    let body = null;
    try {
      body = await res.json();
    } catch {}
    if (!res.ok || body?.success === false) {
      throw new Error(ERRORS[res.status] ?? body?.message ?? `iSave returned HTTP ${res.status}.`);
    }
    return normalize(body ?? {});
  },
};

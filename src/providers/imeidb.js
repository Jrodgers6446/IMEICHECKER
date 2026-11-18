const BASE = 'https://imeidb.xyz/api/imei/';

const ERRORS = {
  401: 'ImeiDB rejected the API key.',
  402: 'Your ImeiDB balance is empty.',
  429: 'ImeiDB rate limit reached. Try again in a minute.',
  460: 'ImeiDB says this IMEI is invalid.',
};

// Response shape: https://imeidb.xyz/api
export function normalize(body) {
  const d = body.data ?? {};
  const spec = d.device_spec ?? {};
  const fields = [];
  const add = (label, value) => {
    if (value === undefined || value === null || value === '') return;
    fields.push({ label, value: Array.isArray(value) ? value.join(', ') : String(value) });
  };

  add('Name', d.name);
  add('Brand', d.brand);
  add('Model', d.model);
  add('Manufacturer', d.manufacturer);
  add('Device type', d.type);
  add('Model numbers', spec.aliases);
  add('Operating system', spec.os);
  add('SIM slots', spec.sim_slots);
  add('NFC', spec.nfc === undefined ? undefined : spec.nfc ? 'Yes' : 'No');
  add('Networks', spec.nettech);
  add('Speed', spec.speed);
  add('Wi-Fi', spec.wlan);
  add('Bluetooth', spec.bluetooth);
  add('USB', spec.usb);

  const blacklisted = d.blacklist?.status;
  return {
    fields,
    color: null,
    status:
      typeof blacklisted === 'boolean'
        ? { label: 'Blacklist', value: blacklisted ? 'Blacklisted' : 'Clean', level: blacklisted ? 'bad' : 'good' }
        : null,
  };
}

export const imeidb = {
  id: 'imeidb',
  name: 'ImeiDB',
  docsUrl: 'https://imeidb.xyz/api',
  signupUrl: 'https://imeidb.xyz/',
  hostPermission: 'https://imeidb.xyz/*',
  provides: 'device specs, manufacturer, device type, blacklist status',
  returnsColor: false,
  colorNote: 'ImeiDB does not return color.',

  async lookup(imei, apiKey, fetchFn = fetch) {
    const res = await fetchFn(BASE + imei, {
      headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
    });
    let body = null;
    try {
      body = await res.json();
    } catch {}
    if (!res.ok || body?.success === false) {
      const status = body?.code ?? res.status;
      throw new Error(ERRORS[status] ?? body?.message ?? `ImeiDB returned HTTP ${res.status}.`);
    }
    return normalize(body);
  },
};

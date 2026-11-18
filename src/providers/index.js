import { imeidb } from './imeidb.js';

// A provider is { id, name, docsUrl, signupUrl, hostPermission, provides,
// lookup(imei, apiKey, fetchFn) } where lookup resolves to
// { fields: [{ label, value }], status?: { label, value, level: 'good' | 'bad' | 'warn' } }
// and throws an Error with a user-readable message on failure.
export const providers = [imeidb];

export function getProvider(id) {
  return providers.find((p) => p.id === id) ?? null;
}

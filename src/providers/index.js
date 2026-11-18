import { imeidb } from './imeidb.js';
import { isave } from './isave.js';

// A provider is { id, name, docsUrl, signupUrl, hostPermission, provides,
// returnsColor, colorNote?, lookup(imei, apiKey, fetchFn) } where lookup resolves to
// { fields: [{ label, value }], color: string | null,
//   status?: { label, value, level: 'good' | 'bad' | 'warn' } }
// and throws an Error with a user-readable message on failure.
export const providers = [imeidb, isave];

export function getProvider(id) {
  return providers.find((p) => p.id === id) ?? null;
}

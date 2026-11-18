import { lookupTac } from './tac.js';
import { getProvider } from './providers/index.js';

// Combines the offline TAC match with the optional online provider.
// The online part never throws: failures come back as `remoteError`.
export async function lookupImei(parsed, { db, settings, fetchFn }) {
  const local = lookupTac(db, parsed.tac);
  const provider = getProvider(settings.providerId);
  const apiKey = settings.apiKeys[settings.providerId];

  if (!settings.onlineLookup || !provider || !apiKey) return { local, remote: null, remoteError: null };

  try {
    const remote = await provider.lookup(parsed.imei, apiKey, fetchFn);
    return { local, remote, remoteError: null, providerName: provider.name };
  } catch (err) {
    const message = err instanceof TypeError ? `Could not reach ${provider.name}. Check your connection.` : err.message;
    return { local, remote: null, remoteError: message, providerName: provider.name };
  }
}

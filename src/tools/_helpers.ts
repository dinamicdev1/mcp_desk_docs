import type { ZohoDeskAPI } from '../client/index.js';
import {
  getStoredRefreshToken,
  getStoredOrgId,
  saveOrgId,
} from '../utils/secure-storage.js';

/**
 * Resuelve el refresh token: parametro > memoria > secure-storage > error.
 * Una vez resuelto, queda en memoria del client para llamadas siguientes.
 */
export async function resolveToken(
  api: ZohoDeskAPI,
  paramToken?: string,
): Promise<void> {
  if (paramToken) {
    api.client.setRefreshToken(paramToken);
    return;
  }

  const currentToken = api.client.getRefreshToken();
  if (currentToken && currentToken.length > 0) return;

  const storedToken = await getStoredRefreshToken();
  if (storedToken) {
    api.client.setRefreshToken(storedToken);
    return;
  }

  throw new Error(
    'Not authenticated. Use zoho_setup to configure credentials, then zoho_connect to authenticate.',
  );
}

/**
 * Resuelve el orgId: parametro > memoria > secure-storage > auto-detect via API > error.
 * Cuando hace auto-detect, persiste el resultado para llamadas siguientes.
 */
export async function resolveOrgId(
  api: ZohoDeskAPI,
  paramOrgId?: string,
): Promise<string> {
  if (paramOrgId) {
    api.client.setOrgId(paramOrgId);
    return paramOrgId;
  }

  const currentOrgId = api.client.getOrgId();
  if (currentOrgId && currentOrgId.length > 0) return currentOrgId;

  const defaultId = api.client.getDefaultOrgId();
  if (defaultId) {
    api.client.setOrgId(defaultId);
    return defaultId;
  }

  const storedId = await getStoredOrgId();
  if (storedId) {
    api.client.setDefaultOrgId(storedId);
    return storedId;
  }

  console.error('[Helpers] No org_id configured, auto-detecting via /organizations...');
  try {
    const orgs = await api.organizations.listOrganizations();
    if (orgs && orgs.length > 0) {
      const preferred = orgs.find(o => o.isDefault) || orgs[0];
      const id = String(preferred.id);
      console.error(`[Helpers] Auto-detected org ID: ${id} (${preferred.companyName})`);
      api.client.setDefaultOrgId(id);
      await saveOrgId(id);
      return id;
    }
  } catch (err: any) {
    console.error(`[Helpers] Auto-detect failed: ${err.message}`);
  }

  throw new Error(
    'Could not determine org_id. Pass it as parameter, set ZOHO_ORG_ID, or use zoho_connection_status to check setup.',
  );
}

/**
 * Estandariza el formato de respuesta de las tools.
 */
export function toolResult(data: unknown) {
  return {
    content: [
      { type: 'text' as const, text: JSON.stringify(data, null, 2) },
    ],
  };
}

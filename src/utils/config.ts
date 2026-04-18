import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ZohoDeskConfig } from '../types/index.js';
import { loadConfig as loadSecureConfig } from './secure-storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carga .env desde la raiz del proyecto - opcional, para desarrollo local
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath, debug: false });

/**
 * Sanitiza un valor de env var: si es un placeholder no resuelto (ej: "${user_config.x}")
 * lo trata como vacio.
 */
function sanitizeEnv(value: string | undefined): string {
  if (!value) return '';
  if (value.startsWith('${') && value.endsWith('}')) return '';
  return value;
}

export const DEFAULT_SCOPES = [
  'Desk.articles.READ',
  'Desk.articles.CREATE',
  'Desk.articles.UPDATE',
  'Desk.articles.DELETE',
  'Desk.settings.READ',
];

/**
 * Carga la configuracion de Zoho Desk.
 *
 * Prioridad:
 * 1. Variables de entorno
 * 2. Secure-storage (config persistido por zoho_setup/zoho_connect)
 * 3. Sin config -> el server arranca en modo setup (solo tools OAuth utilizables)
 *
 * NO lanza error si faltan credenciales: el server siempre arranca y expone
 * las tools OAuth para configuracion inicial desde la IA.
 */
export async function loadConfig(): Promise<ZohoDeskConfig> {
  const secureConfig = await loadSecureConfig();

  const clientId = sanitizeEnv(process.env.ZOHO_CLIENT_ID) || secureConfig?.clientId || '';
  const clientSecret = sanitizeEnv(process.env.ZOHO_CLIENT_SECRET) || secureConfig?.clientSecret || '';
  const region = (sanitizeEnv(process.env.ZOHO_REGION) || secureConfig?.region || 'com') as ZohoDeskConfig['region'];

  const scopesEnv = process.env.ZOHO_OAUTH_SCOPES;
  const oauthScopes = scopesEnv
    ? scopesEnv.split(',').map(s => s.trim()).filter(s => s.length > 0)
    : secureConfig?.oauthScopes || DEFAULT_SCOPES;

  const refreshToken = sanitizeEnv(process.env.ZOHO_REFRESH_TOKEN) || secureConfig?.refreshToken || '';

  const orgId = sanitizeEnv(process.env.ZOHO_ORG_ID) || secureConfig?.orgId || '';

  const defaultDepartmentId = sanitizeEnv(process.env.ZOHO_DEFAULT_DEPARTMENT_ID) || secureConfig?.defaultDepartmentId;

  const configSource = process.env.ZOHO_CLIENT_ID ? 'env' :
    secureConfig?.clientId ? 'secure-storage' : 'none';

  console.error(`[Config] Source: ${configSource}`);
  console.error(`[Config] Client ID: ${clientId ? 'configured' : 'NOT SET'}`);
  console.error(`[Config] Refresh token: ${refreshToken ? `${refreshToken.length} chars` : 'NOT SET'}`);
  console.error(`[Config] Org ID: ${orgId || 'NOT SET (will auto-detect via /organizations)'}`);

  if (!clientId || !clientSecret) {
    console.error(`
╔════════════════════════════════════════════════════════════════╗
║          ZOHO DESK MCP - SETUP REQUIRED                        ║
╠════════════════════════════════════════════════════════════════╣
║ No credentials configured.                                     ║
║                                                                ║
║ Use the 'zoho_setup' tool to configure your credentials:       ║
║   - client_id (from Zoho API Console)                          ║
║   - client_secret (from Zoho API Console)                      ║
║                                                                ║
║ Then use 'zoho_connect' to authenticate via OAuth.             ║
╚════════════════════════════════════════════════════════════════╝
    `);
  } else if (!refreshToken) {
    console.error(`
╔════════════════════════════════════════════════════════════════╗
║          ZOHO DESK MCP - AUTHENTICATION REQUIRED               ║
╠════════════════════════════════════════════════════════════════╣
║ Credentials configured but no refresh token.                   ║
║                                                                ║
║ Use 'zoho_connect' to authenticate via OAuth.                  ║
╚════════════════════════════════════════════════════════════════╝
    `);
  }

  return {
    clientId,
    clientSecret,
    refreshToken,
    region,
    orgId,
    oauthScopes,
    defaultDepartmentId,
    defaultOrgId: orgId || undefined,
  };
}

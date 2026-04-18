import { z } from 'zod';
import type { ZohoDeskConfig } from '../types/index.js';
import {
  CALLBACK_PORT,
  CALLBACK_PATH,
  generateAuthUrl,
  executeOAuthFlow,
  exchangeCodeForRefreshToken,
} from '../utils/oauth-helpers.js';
import {
  saveConfig,
  loadConfig as loadSecureConfig,
  clearConfig,
  saveRefreshToken,
  saveOrgId,
  getConfigDir,
} from '../utils/secure-storage.js';
import { DEFAULT_SCOPES } from '../utils/config.js';
import type { ZohoDeskAPI } from '../client/index.js';

export interface OAuthToolResult {
  content: Array<{ type: 'text'; text: string }>;
}

/**
 * Auto-detecta el orgId via API y lo persiste.
 */
async function autoDetectOrgId(api: ZohoDeskAPI): Promise<string | null> {
  try {
    const orgs = await api.organizations.listOrganizations();
    if (orgs && orgs.length > 0) {
      const preferred = orgs.find(o => o.isDefault) || orgs[0];
      const orgId = String(preferred.id);
      api.client.setDefaultOrgId(orgId);
      await saveOrgId(orgId);
      console.error(`[OAuth] Auto-detected org ID: ${orgId} (${preferred.companyName})`);
      return orgId;
    }
  } catch (err: any) {
    console.error(`[OAuth] Could not auto-detect org ID: ${err.message}`);
  }
  return null;
}

export function createOAuthTools(config: ZohoDeskConfig, api?: ZohoDeskAPI) {
  return {
    zoho_setup: {
      description:
        'Configura las credenciales de Zoho Desk. Guarda client_id y client_secret de forma segura. Ejecuta esto ANTES de zoho_connect. Las credenciales se obtienen en https://api-console.zoho.com/ creando una Server-based Application con redirect URI http://localhost:3000/callback.',
      parameters: z.object({
        client_id: z.string().describe('Client ID de la aplicacion OAuth de Zoho.'),
        client_secret: z.string().describe('Client Secret de la aplicacion OAuth de Zoho.'),
        region: z.enum(['com', 'eu', 'in', 'com.au', 'jp']).optional().default('com').describe('Region Zoho (default: com).'),
        scopes: z.array(z.string()).optional().describe(`Scopes OAuth. Default: ${DEFAULT_SCOPES.join(', ')}`),
      }),
      execute: async (args: { client_id: string; client_secret: string; region?: string; scopes?: string[] }): Promise<OAuthToolResult> => {
        try {
          const scopes = args.scopes || DEFAULT_SCOPES;

          await saveConfig({
            clientId: args.client_id,
            clientSecret: args.client_secret,
            region: args.region || 'com',
            oauthScopes: scopes,
          });

          config.clientId = args.client_id;
          config.clientSecret = args.client_secret;
          config.region = (args.region || 'com') as ZohoDeskConfig['region'];
          config.oauthScopes = scopes;

          const configDir = getConfigDir();

          return {
            content: [
              {
                type: 'text',
                text: `Credentials saved successfully!

Storage location: ${configDir}/config.json

Next step: Use 'zoho_connect' to authenticate with Zoho Desk via OAuth.`,
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: `Failed to save credentials: ${error.message}` }],
          };
        }
      },
    },

    zoho_connect: {
      description:
        'Conecta con Zoho Desk via OAuth. Abre el navegador, captura el token y lo guarda automaticamente. Auto-detecta el orgId tras conexion exitosa. Requiere zoho_setup previo (o credenciales en env vars).',
      parameters: z.object({
        scopes: z.array(z.string()).optional().describe('Scopes opcionales. Si no se pasa, usa los configurados.'),
      }),
      execute: async (args: { scopes?: string[] }): Promise<OAuthToolResult> => {
        if (!config.clientId || !config.clientSecret) {
          return {
            content: [
              {
                type: 'text',
                text: `No credentials configured.

Use 'zoho_setup' first.

Get credentials at: https://api-console.zoho.com/`,
              },
            ],
          };
        }

        const scopes = args.scopes || config.oauthScopes;

        try {
          console.error(`[OAuth] Starting OAuth flow...`);

          const result = await executeOAuthFlow(
            config.clientId,
            config.clientSecret,
            config.region,
            scopes,
            { autoOpenBrowser: true, timeoutMs: 5 * 60 * 1000 },
          );

          await saveRefreshToken(result.refreshToken);
          config.refreshToken = result.refreshToken;

          if (api) {
            api.client.setRefreshToken(result.refreshToken);
          }

          console.error(`[OAuth] Token saved (${result.refreshToken.length} chars)`);

          let orgInfo = '';
          if (api) {
            const detectedId = await autoDetectOrgId(api);
            if (detectedId) {
              orgInfo = `\nOrg ID: ${detectedId} (auto-detected and saved)`;
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: `OAuth authorization successful! Token saved automatically.

All Zoho Desk tools are now ready to use.${orgInfo}

Granted scopes:
${scopes.map(s => `  - ${s}`).join('\n')}`,
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: 'text',
                text: `OAuth authorization failed: ${error.message}

Please check:
- Credentials are correct
- No other service is using port ${CALLBACK_PORT}
- You authorized within 5 minutes
- Your Zoho account has access to Zoho Desk`,
              },
            ],
          };
        }
      },
    },

    zoho_disconnect: {
      description: 'Desconecta de Zoho Desk. Borra credenciales y tokens guardados.',
      parameters: z.object({}),
      execute: async (): Promise<OAuthToolResult> => {
        try {
          await clearConfig();
          config.clientId = '';
          config.clientSecret = '';
          config.refreshToken = '';
          config.orgId = '';

          return {
            content: [
              {
                type: 'text',
                text: `Disconnected successfully.

To reconnect:
1. Use 'zoho_setup' to configure new credentials
2. Use 'zoho_connect' to authenticate via OAuth`,
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: `Failed to disconnect: ${error.message}` }],
          };
        }
      },
    },

    zoho_oauth_get_url: {
      description: 'Genera solo la URL de autorizacion sin levantar servidor. Usa zoho_oauth_exchange_code despues.',
      parameters: z.object({
        scopes: z.array(z.string()).optional(),
      }),
      execute: async (args: { scopes?: string[] }): Promise<OAuthToolResult> => {
        if (!config.clientId) {
          return {
            content: [{ type: 'text', text: `No credentials configured. Use 'zoho_setup' first.` }],
          };
        }

        const scopes = args.scopes || config.oauthScopes;
        const authUrl = generateAuthUrl(config.clientId, config.region, scopes);

        return {
          content: [
            {
              type: 'text',
              text: `OAuth Authorization URL
=======================

Open this URL in your browser:

${authUrl}

After authorizing, you'll be redirected to:
http://localhost:${CALLBACK_PORT}${CALLBACK_PATH}?code=XXXXX...

Copy the 'code' parameter and use 'zoho_oauth_exchange_code' to complete setup.`,
            },
          ],
        };
      },
    },

    zoho_oauth_exchange_code: {
      description: 'Intercambia authorization code por refresh token. Uso manual tras zoho_oauth_get_url.',
      parameters: z.object({
        code: z.string().describe('Authorization code del callback de Zoho'),
      }),
      execute: async (args: { code: string }): Promise<OAuthToolResult> => {
        if (!config.clientId || !config.clientSecret) {
          return {
            content: [{ type: 'text', text: `No credentials configured. Use 'zoho_setup' first.` }],
          };
        }

        try {
          const result = await exchangeCodeForRefreshToken(
            args.code,
            config.clientId,
            config.clientSecret,
            config.region,
          );

          await saveRefreshToken(result.refreshToken);
          config.refreshToken = result.refreshToken;

          if (api) {
            api.client.setRefreshToken(result.refreshToken);
          }

          let orgInfo = '';
          if (api) {
            const detectedId = await autoDetectOrgId(api);
            if (detectedId) {
              orgInfo = `\nOrg ID: ${detectedId} (auto-detected and saved)`;
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: `Token obtained and saved automatically!${orgInfo}`,
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: 'text',
                text: `Failed to exchange code: ${error.message}

The authorization code expires in 60 seconds.
Generate a new URL with 'zoho_oauth_get_url' and try again.`,
              },
            ],
          };
        }
      },
    },

    zoho_connection_status: {
      description: 'Verifica el estado de la conexion con Zoho Desk. Reporta credenciales, refresh token, orgId, scopes y region.',
      parameters: z.object({}),
      execute: async (): Promise<OAuthToolResult> => {
        const secureConfig = await loadSecureConfig();
        const hasCredentials = !!(config.clientId && config.clientSecret);
        const hasRefreshToken = !!(config.refreshToken && config.refreshToken.length > 0);
        const configSource = process.env.ZOHO_CLIENT_ID ? 'Environment variables' :
          secureConfig?.clientId ? 'Secure storage' : 'Not configured';

        let status: string;
        let nextStep: string;

        if (!hasCredentials) {
          status = 'NOT CONFIGURED';
          nextStep = `Use 'zoho_setup' to configure your Zoho API credentials.\nGet them at: https://api-console.zoho.com/`;
        } else if (!hasRefreshToken) {
          status = 'CONFIGURED, NOT AUTHENTICATED';
          nextStep = `Use 'zoho_connect' to authenticate via OAuth.`;
        } else {
          status = 'CONNECTED';
          nextStep = `All tools are ready. Try 'list_articles' or 'list_departments'.`;
        }

        const configDir = getConfigDir();
        const orgId = config.orgId || secureConfig?.orgId;

        return {
          content: [
            {
              type: 'text',
              text: `Zoho Desk Connection Status
================================

Status: ${status}
Config source: ${configSource}
Config directory: ${configDir}

${hasCredentials ? '[OK]' : '[MISSING]'} Client ID: ${hasCredentials ? 'Configured' : 'NOT SET'}
${hasCredentials ? '[OK]' : '[MISSING]'} Client Secret: ${hasCredentials ? 'Configured' : 'NOT SET'}
${hasRefreshToken ? '[OK]' : '[MISSING]'} Refresh Token: ${hasRefreshToken ? 'Saved' : 'NOT SET'}

Region: ${config.region}
${orgId ? `Org ID: ${orgId}` : 'Org ID: Not set (will auto-detect on first call)'}

OAuth Scopes (${config.oauthScopes.length}):
${config.oauthScopes.map(s => `  - ${s}`).join('\n')}

Next: ${nextStep}`,
            },
          ],
        };
      },
    },
  };
}

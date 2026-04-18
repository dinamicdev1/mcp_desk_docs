#!/usr/bin/env node

/**
 * CLI para gestionar OAuth de Zoho Desk
 *
 * Uso:
 *   npm run oauth          - Flujo automatico (abre navegador)
 *   npm run oauth:manual   - Flujo manual (muestra URL)
 *   npm run oauth:exchange - Intercambia codigo por token
 */

import { loadConfig } from './utils/config.js';
import {
  generateAuthUrl,
  executeOAuthFlow,
  exchangeCodeForRefreshToken,
  CALLBACK_PORT,
  CALLBACK_PATH,
} from './utils/oauth-helpers.js';
import { saveRefreshToken, getConfigDir } from './utils/secure-storage.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'auto';

  try {
    const config = await loadConfig();

    if (!config.clientId || !config.clientSecret) {
      console.error(`
Missing credentials. Set ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET in .env
or use the 'zoho_setup' MCP tool to configure them via secure-storage.

Get credentials at: https://api-console.zoho.com/
`);
      process.exit(1);
    }

    switch (command) {
      case 'auto':
        await runAutoFlow(config);
        break;
      case 'manual':
        await runManualFlow(config);
        break;
      case 'exchange':
        const code = args[1];
        if (!code) {
          console.error('Usage: npm run oauth:exchange <authorization_code>');
          process.exit(1);
        }
        await runExchangeFlow(config, code);
        break;
      case 'url':
        showAuthUrl(config);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.error('Available commands: auto, manual, exchange, url');
        process.exit(1);
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

async function runAutoFlow(config: any) {
  console.log(`
ZOHO DESK - OAuth Authorization
================================
Opening browser for authorization...
You will be redirected to localhost:${CALLBACK_PORT} when done.
`);

  const result = await executeOAuthFlow(
    config.clientId,
    config.clientSecret,
    config.region,
    config.oauthScopes,
    { autoOpenBrowser: true }
  );

  await saveRefreshToken(result.refreshToken);

  console.log(`
Authorization Successful!
Token persisted to: ${getConfigDir()}/config.json

Refresh Token (${result.refreshToken.length} chars):
${result.refreshToken}
`);
}

async function runManualFlow(config: any) {
  const authUrl = generateAuthUrl(config.clientId, config.region, config.oauthScopes);

  console.log(`
ZOHO DESK - Manual OAuth Flow
==============================
1. Open this URL in your browser:

${authUrl}

2. Authorize the application
3. Waiting for callback on localhost:${CALLBACK_PORT}...
`);

  const result = await executeOAuthFlow(
    config.clientId,
    config.clientSecret,
    config.region,
    config.oauthScopes,
    { autoOpenBrowser: false }
  );

  await saveRefreshToken(result.refreshToken);

  console.log(`
Authorization Successful!
Token persisted to: ${getConfigDir()}/config.json

Refresh Token (${result.refreshToken.length} chars):
${result.refreshToken}
`);
}

async function runExchangeFlow(config: any, code: string) {
  console.log('Exchanging authorization code for refresh token...');

  const result = await exchangeCodeForRefreshToken(
    code,
    config.clientId,
    config.clientSecret,
    config.region
  );

  await saveRefreshToken(result.refreshToken);

  console.log(`
Token Exchange Successful!
Token persisted to: ${getConfigDir()}/config.json

Refresh Token (${result.refreshToken.length} chars):
${result.refreshToken}
`);
}

function showAuthUrl(config: any) {
  const authUrl = generateAuthUrl(config.clientId, config.region, config.oauthScopes);

  console.log(`
Authorization URL:
${authUrl}

After authorizing, you'll be redirected to:
http://localhost:${CALLBACK_PORT}${CALLBACK_PATH}?code=XXXXX

Use the code with: npm run oauth:exchange <code>
`);
}

main();

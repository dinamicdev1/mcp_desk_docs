# Modernizar mcp_desk_docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernizar `mcp_desk_docs` adoptando el patron OAuth/secure-storage de `mcp-zoho-project`, manteniendo el alcance acotado a Knowledge Base. Las tools de dominio dejan `refresh_token` y `org_id` como opcionales, resueltos automaticamente desde memoria/secure-storage tras `zoho_setup` + `zoho_connect`.

**Architecture:** Mantener la estructura de carpetas existente (`src/{client,tools,types,utils}`). Reemplazar `token-storage.ts` por `secure-storage.ts` (adaptado de `mcp-zoho-project`). Anadir helpers `_helpers.ts` con `resolveToken`/`resolveOrgId`/`toolResult`. Reescribir `tools/oauth.ts` y `utils/config.ts`. Adaptar las 4 tools de dominio (articles, categories, sections, departments) para usar los helpers. Anadir servicio `organizations` y tools `meta` para auto-detect de orgId. Validar end-to-end con smoke test contra credenciales reales.

**Tech Stack:** TypeScript (ESM), Node 18+, @modelcontextprotocol/sdk 1.22, axios, zod, zod-to-json-schema, dotenv. Sin tests unitarios (mockear axios no aporta valor para un proxy HTTP). Validacion via `npm run smoke`.

---

## Mapa de archivos

**Nuevos:**
- `src/utils/secure-storage.ts` — persistencia de credenciales en `%APPDATA%/mcp_desk_docs/config.json`.
- `src/tools/_helpers.ts` — `resolveToken`, `resolveOrgId`, `toolResult`.
- `src/client/services/organizations.ts` — list orgs.
- `src/tools/meta.ts` — `list_organizations`.
- `scripts/smoke-test.mjs` — smoke test end-to-end.

**Reescritos completos:**
- `src/utils/config.ts` — fusiona env + secure-storage, no lanza error.
- `src/tools/oauth.ts` — tools `zoho_setup`/`zoho_connect`/`zoho_disconnect`/`zoho_connection_status`/`zoho_oauth_get_url`/`zoho_oauth_exchange_code`.
- `src/oauth-cli.ts` — usa secure-storage en vez de token-storage.

**Modificados:**
- `src/client/zoho-client.ts` — import `secure-storage`, anadir `setOrgId`/`getOrgId`/`getDefaultOrgId`/`setDefaultOrgId`, anadir `transformResponse` para preservar IDs grandes.
- `src/client/index.ts` — registrar `OrganizationsService`.
- `src/utils/schemas.ts` — `baseSchema` con `refresh_token` opcional.
- `src/tools/articles.ts` — usar `resolveToken`/`resolveOrgId`/`toolResult`.
- `src/tools/categories.ts` — idem.
- `src/tools/sections.ts` — idem.
- `src/tools/departments.ts` — idem.
- `src/tools/index.ts` — pasar `api` a `createOAuthTools(config, api)`, registrar `createMetaTools(api)`.
- `src/index.ts` — agregar `instructions` al server (Nivel 1 del manual).
- `src/types/zoho-desk.ts` — anadir `defaultOrgId?` al `ZohoDeskConfig` (opcional, no rompe nada).
- `package.json` — anadir script `smoke`.
- `.gitignore` — agregar `.zoho-desk-token` (vestigio del sistema viejo).
- `README.md` — actualizar setup para nuevo flujo OAuth.

**Eliminado:**
- `src/utils/token-storage.ts`.
- Imports residuales en otros archivos.

---

## Task 1: Crear secure-storage.ts

**Files:**
- Create: `src/utils/secure-storage.ts`

**Por que:** Reemplaza `token-storage.ts` con persistencia en directorio de config del OS (no en cwd). Misma API que `mcp-zoho-project` para que el patron sea reutilizable en los otros MCPs Desk.

- [ ] **Step 1: Crear el archivo con la implementacion completa**

```typescript
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const APP_NAME = 'mcp_desk_docs';

export interface SecureConfig {
  clientId: string;
  clientSecret: string;
  region: string;
  oauthScopes?: string[];
  refreshToken?: string;
  orgId?: string;
  defaultDepartmentId?: string;
  configuredAt: string;
  lastTokenRefresh?: string;
}

/**
 * Directorio de configuracion seguro segun OS.
 * - Windows: %APPDATA%/mcp_desk_docs/
 * - macOS: ~/Library/Application Support/mcp_desk_docs/
 * - Linux: ~/.config/mcp_desk_docs/ (o $XDG_CONFIG_HOME)
 */
export function getConfigDir(): string {
  const platform = process.platform;

  if (platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, APP_NAME);
  }

  if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', APP_NAME);
  }

  const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(xdgConfig, APP_NAME);
}

function getConfigFilePath(): string {
  return path.join(getConfigDir(), 'config.json');
}

async function ensureConfigDir(): Promise<void> {
  const dir = getConfigDir();
  await fs.mkdir(dir, { recursive: true });
}

export async function saveConfig(data: Partial<SecureConfig>): Promise<void> {
  await ensureConfigDir();
  const configPath = getConfigFilePath();

  const existing = await loadConfig();
  const merged: SecureConfig = {
    clientId: data.clientId || existing?.clientId || '',
    clientSecret: data.clientSecret || existing?.clientSecret || '',
    region: data.region || existing?.region || 'com',
    oauthScopes: data.oauthScopes || existing?.oauthScopes,
    refreshToken: data.refreshToken !== undefined ? data.refreshToken : existing?.refreshToken,
    orgId: data.orgId !== undefined ? data.orgId : existing?.orgId,
    defaultDepartmentId: data.defaultDepartmentId !== undefined ? data.defaultDepartmentId : existing?.defaultDepartmentId,
    configuredAt: existing?.configuredAt || new Date().toISOString(),
    lastTokenRefresh: data.refreshToken ? new Date().toISOString() : existing?.lastTokenRefresh,
  };

  const jsonContent = JSON.stringify(merged, null, 2);
  await fs.writeFile(configPath, jsonContent, 'utf-8');

  if (process.platform !== 'win32') {
    try {
      await fs.chmod(configPath, 0o600);
    } catch {
      // Ignorar errores de permisos
    }
  }

  console.error(`[SecureStorage] Config saved to: ${configPath}`);
}

export async function loadConfig(): Promise<SecureConfig | null> {
  const configPath = getConfigFilePath();

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content) as SecureConfig;
  } catch (error: any) {
    if (error.code === 'ENOENT') return null;
    console.error(`[SecureStorage] Error loading config: ${error.message}`);
    return null;
  }
}

export async function clearConfig(): Promise<void> {
  const configPath = getConfigFilePath();

  try {
    await fs.unlink(configPath);
    console.error(`[SecureStorage] Config deleted: ${configPath}`);
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.error(`[SecureStorage] Error deleting config: ${error.message}`);
    }
  }
}

export async function isConfigured(): Promise<boolean> {
  const config = await loadConfig();
  return !!(config?.clientId && config?.clientSecret);
}

export async function hasStoredToken(): Promise<boolean> {
  const config = await loadConfig();
  return !!(config?.refreshToken && config.refreshToken.length > 0);
}

export async function getStoredRefreshToken(): Promise<string | null> {
  const config = await loadConfig();
  return config?.refreshToken || null;
}

export async function saveRefreshToken(refreshToken: string): Promise<void> {
  await saveConfig({ refreshToken });
}

export async function saveOrgId(orgId: string): Promise<void> {
  await saveConfig({ orgId });
}

export async function getStoredOrgId(): Promise<string | null> {
  const config = await loadConfig();
  return config?.orgId || null;
}
```

- [ ] **Step 2: Compilar y verificar sin errores**

Run: `npm run build`
Expected: compila sin errores. `dist/utils/secure-storage.js` existe.

- [ ] **Step 3: Commit**

```bash
git add src/utils/secure-storage.ts
git commit -m "feat: agregar secure-storage para persistir credenciales

Reemplaza token-storage.ts con persistencia en directorio de config del OS
(%APPDATA% en Windows, ~/Library/Application Support en macOS,
\$XDG_CONFIG_HOME/mcp_desk_docs en Linux). Permisos 0600 en Unix.

Misma API que mcp-zoho-project para reusabilidad."
```

---

## Task 2: Reescribir utils/config.ts

**Files:**
- Modify: `src/utils/config.ts` (rewrite completo)
- Modify: `src/types/zoho-desk.ts:2-10` (anadir `defaultOrgId?` al `ZohoDeskConfig`)

**Por que:** El config actual lanza error si faltan credenciales (rompe modo setup) y carga desde `token-storage` deshabilitado. Debe fusionar env + secure-storage y permitir arranque sin credenciales.

- [ ] **Step 1: Anadir campo opcional al ZohoDeskConfig**

Editar `src/types/zoho-desk.ts` lineas 2-10. Cambiar a:

```typescript
export interface ZohoDeskConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  region: 'com' | 'eu' | 'in' | 'com.au' | 'jp';
  orgId: string;
  oauthScopes: string[];
  defaultDepartmentId?: string;
  defaultOrgId?: string;
}
```

- [ ] **Step 2: Reemplazar el contenido completo de utils/config.ts**

```typescript
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
```

- [ ] **Step 3: Compilar**

Run: `npm run build`
Expected: compila sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/utils/config.ts src/types/zoho-desk.ts
git commit -m "refactor: loadConfig tolerante + lectura de secure-storage

loadConfig ya no lanza error si faltan credenciales: el server arranca
siempre y expone las tools OAuth para setup inicial desde la IA.

Fusiona env vars + secure-storage. Sanitiza placeholders no resueltos
(\${user_config.x}). Anade DEFAULT_SCOPES exportado para uso compartido."
```

---

## Task 3: Eliminar token-storage.ts y limpiar imports

**Files:**
- Delete: `src/utils/token-storage.ts`
- Modify: `src/client/zoho-client.ts:8,12` (eliminar import de token-storage)

**Por que:** Vestigio del sistema viejo que ya no se usa. Hay que eliminarlo y purgar imports residuales para que el build no rompa.

- [ ] **Step 1: Listar todas las referencias a token-storage**

Run: `grep -rn "token-storage" src/`
Expected output: lista de imports en `zoho-client.ts` y `oauth-cli.ts` (oauth-cli se reescribe en Task 9).

- [ ] **Step 2: Eliminar el archivo**

```bash
git rm src/utils/token-storage.ts
```

- [ ] **Step 3: Limpiar import en zoho-client.ts**

Editar `src/client/zoho-client.ts`. Cambiar la linea 8:

```typescript
import { saveRefreshToken } from '../utils/token-storage.js';
```

por:

```typescript
import { saveRefreshToken, saveOrgId } from '../utils/secure-storage.js';
```

Y eliminar la linea 12 que reexporta `loadRefreshToken`:

Antes:
```typescript
export { saveRefreshToken, loadRefreshToken } from '../utils/token-storage.js';
```

Despues:
```typescript
export { saveRefreshToken, saveOrgId } from '../utils/secure-storage.js';
```

- [ ] **Step 4: Verificar que no queden referencias**

Run: `grep -rn "token-storage" src/`
Expected: solo `oauth-cli.ts` (se arregla en Task 9; lo dejamos roto temporalmente).

- [ ] **Step 5: Build (esperando que oauth-cli falle)**

Run: `npm run build`
Expected: error en `oauth-cli.ts` por import faltante. **Ese error es esperado** y se resuelve en Task 9.

- [ ] **Step 6: Commit**

```bash
git add src/utils/token-storage.ts src/client/zoho-client.ts
git commit -m "chore: eliminar token-storage.ts (reemplazado por secure-storage)

oauth-cli.ts queda temporalmente roto; se reescribe en proximo commit
para usar secure-storage."
```

---

## Task 4: Actualizar zoho-client.ts (orgId getters/setters + transformResponse)

**Files:**
- Modify: `src/client/zoho-client.ts`

**Por que:** Necesitamos que el client soporte set/get de orgId en runtime (para el patron resolveOrgId) y que preserve IDs largos como string (defensa contra perdida de precision).

- [ ] **Step 1: Anadir transformResponse al axios.create**

Editar `src/client/zoho-client.ts`. En el constructor, donde dice:

```typescript
this.axiosInstance = axios.create({
  baseURL: this.getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});
```

Cambiar a:

```typescript
this.axiosInstance = axios.create({
  baseURL: this.getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  // Zoho Desk devuelve algunos IDs numericos largos que pierden precision con
  // JSON.parse default. Envolvemos enteros >=16 digitos como string antes de parsear.
  transformResponse: [
    (data: string) => {
      if (typeof data !== 'string' || data.length === 0) return data;
      try {
        const safe = data.replace(
          /([:\[,]\s*)(-?\d{16,})(\s*[,\]}])/g,
          '$1"$2"$3',
        );
        return JSON.parse(safe);
      } catch {
        try { return JSON.parse(data); } catch { return data; }
      }
    },
  ],
});
```

- [ ] **Step 2: Persistir refresh token en setRefreshToken**

Localizar el metodo `setRefreshToken(refreshToken: string): void` (linea ~295). Reemplazar por:

```typescript
setRefreshToken(refreshToken: string): void {
  const tokenLength = refreshToken?.length || 0;
  console.error(`[ZohoDeskClient] setRefreshToken called - length: ${tokenLength} chars`);

  if (tokenLength < 60) {
    console.error(`[ZohoDeskClient] WARNING: Token appears TRUNCATED (expected ~69 chars, got ${tokenLength})`);
  } else {
    console.error(`[ZohoDeskClient] Token format OK - preview: ${refreshToken.substring(0, 20)}...`);
  }

  if (this.config.refreshToken !== refreshToken) {
    this.config.refreshToken = refreshToken;
    this.accessToken = null;
    this.tokenExpiresAt = 0;
    console.error(`[ZohoDeskClient] Token updated in memory, access token invalidated`);

    saveRefreshToken(refreshToken).catch(err => {
      console.error(`[ZohoDeskClient] Failed to persist refresh token: ${err.message}`);
    });
  } else {
    console.error(`[ZohoDeskClient] Token unchanged, skipping update`);
  }
}
```

- [ ] **Step 3: Anadir getters/setters de orgId**

Despues del metodo `setOrgId` ya existente (~linea 322), reemplazar el metodo completo por:

```typescript
setOrgId(orgId: string): void {
  if (orgId && orgId.length > 0 && this.config.orgId !== orgId) {
    this.config.orgId = orgId;
    console.error(`[ZohoDeskClient] Org ID updated: ${orgId}`);

    saveOrgId(orgId).catch(err => {
      console.error(`[ZohoDeskClient] Failed to persist orgId: ${err.message}`);
    });
  }
}

getDefaultOrgId(): string | undefined {
  return this.config.defaultOrgId;
}

setDefaultOrgId(orgId: string): void {
  this.config.defaultOrgId = orgId;
  this.config.orgId = orgId;
  console.error(`[ZohoDeskClient] Default org ID set: ${orgId}`);

  saveOrgId(orgId).catch(err => {
    console.error(`[ZohoDeskClient] Failed to persist defaultOrgId: ${err.message}`);
  });
}
```

- [ ] **Step 4: Build (oauth-cli sigue roto, esperado)**

Run: `npm run build`
Expected: solo error en `oauth-cli.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/client/zoho-client.ts
git commit -m "feat(client): persistir token y orgId, preservar IDs largos

- setRefreshToken ahora persiste en secure-storage (no solo memoria)
- Anade setOrgId/setDefaultOrgId/getDefaultOrgId con persistencia
- transformResponse envuelve enteros >=16 digitos como string antes
  de parsear JSON (defensa contra perdida de precision)"
```

---

## Task 5: Crear servicio organizations

**Files:**
- Create: `src/client/services/organizations.ts`
- Modify: `src/client/index.ts`
- Modify: `src/types/zoho-desk.ts` (anadir interface `ZohoDeskOrganization`)

**Por que:** Necesitamos invocar `/organizations` para auto-detectar el orgId tras OAuth. Tambien lo expondremos como tool `list_organizations` para inspeccion.

- [ ] **Step 1: Anadir interface al types**

Editar `src/types/zoho-desk.ts`. Despues de `ZohoDeskDepartment` (linea ~260), anadir:

```typescript
// Organization Types
export interface ZohoDeskOrganization {
  id: string;
  companyName: string;
  portalName?: string;
  isDefault?: boolean;
  timeZone?: string;
  phone?: string;
  fax?: string;
  primaryContact?: string;
  website?: string;
  primaryEmail?: string;
}
```

- [ ] **Step 2: Crear el servicio**

```typescript
import type { ZohoDeskClient } from '../zoho-client.js';
import type { ZohoDeskOrganization } from '../../types/index.js';

export class OrganizationsService {
  constructor(private _client: ZohoDeskClient) {}

  /**
   * Lista todas las organizaciones accesibles con el token actual.
   * Endpoint: GET /api/v1/organizations
   */
  async listOrganizations(): Promise<ZohoDeskOrganization[]> {
    const response = await this._client.getList<ZohoDeskOrganization>('/organizations');
    return response.data || [];
  }
}
```

- [ ] **Step 3: Registrar el servicio en ZohoDeskAPI**

Editar `src/client/index.ts`. Reemplazar el contenido completo:

```typescript
import { ZohoDeskClient } from './zoho-client.js';
import { ArticlesService } from './services/articles.js';
import { CategoriesService } from './services/categories.js';
import { SectionsService } from './services/sections.js';
import { DepartmentsService } from './services/departments.js';
import { OrganizationsService } from './services/organizations.js';
import type { ZohoDeskConfig } from '../types/index.js';

export class ZohoDeskAPI {
  public client: ZohoDeskClient;
  public articles: ArticlesService;
  public categories: CategoriesService;
  public sections: SectionsService;
  public departments: DepartmentsService;
  public organizations: OrganizationsService;

  constructor(config: ZohoDeskConfig) {
    this.client = new ZohoDeskClient(config);
    this.articles = new ArticlesService(this.client);
    this.categories = new CategoriesService(this.client);
    this.sections = new SectionsService(this.client);
    this.departments = new DepartmentsService(this.client);
    this.organizations = new OrganizationsService(this.client);
  }
}

export * from './zoho-client.js';
export * from './services/articles.js';
export * from './services/categories.js';
export * from './services/sections.js';
export * from './services/departments.js';
export * from './services/organizations.js';
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: solo error en `oauth-cli.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/client/services/organizations.ts src/client/index.ts src/types/zoho-desk.ts
git commit -m "feat(client): agregar OrganizationsService

Servicio para listar organizaciones accesibles con el token actual.
Sera usado por autoDetectOrgId tras OAuth y expuesto como tool
list_organizations para inspeccion manual."
```

---

## Task 6: Crear tools/_helpers.ts

**Files:**
- Create: `src/tools/_helpers.ts`

**Por que:** Centraliza la resolucion de token y orgId (param > memoria > secure-storage > auto-detect/error). Las tools de dominio solo lo invocan, sin duplicar logica.

- [ ] **Step 1: Crear archivo con helpers completos**

```typescript
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
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: solo error en `oauth-cli.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/tools/_helpers.ts
git commit -m "feat(tools): agregar _helpers con resolveToken/resolveOrgId

Centraliza la resolucion de credenciales para todas las tools de dominio.
Orden: parametro > memoria del client > secure-storage > auto-detect (orgId)
o error (token). Auto-detect de orgId persiste el resultado."
```

---

## Task 7: Reescribir tools/oauth.ts

**Files:**
- Modify: `src/tools/oauth.ts` (rewrite completo)

**Por que:** Las tools actuales devuelven el token al chat para que el usuario lo pegue manualmente. Se reescriben al patron de `mcp-zoho-project`: persistencia automatica, auto-detect de orgId, tool `zoho_setup` para configurar credenciales desde la IA.

- [ ] **Step 1: Reescribir el archivo completo**

```typescript
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
```

- [ ] **Step 2: Build (oauth-cli sigue roto)**

Run: `npm run build`
Expected: solo error en `oauth-cli.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/tools/oauth.ts
git commit -m "feat(tools): reescribir oauth.ts al patron de mcp-zoho-project

Tools nuevas:
- zoho_setup: persiste client_id/secret en secure-storage
- zoho_connect: OAuth flow + auto-detect de orgId + persistencia
- zoho_disconnect: borra config
- zoho_oauth_get_url + zoho_oauth_exchange_code: flujo manual
- zoho_connection_status: reporte de estado

Las tools antiguas (zoho_desk_connect, zoho_desk_oauth_init,
zoho_desk_oauth_get_url, zoho_desk_oauth_exchange_code,
zoho_desk_connection_status) son reemplazadas por las nuevas con
nombres alineados al estandar de la familia MCP Zoho."
```

---

## Task 8: Crear tools/meta.ts

**Files:**
- Create: `src/tools/meta.ts`

**Por que:** Expone `list_organizations` para que la IA pueda inspeccionar las orgs disponibles cuando hay duda sobre cual usar.

- [ ] **Step 1: Crear el archivo**

```typescript
import { z } from 'zod';
import type { ZohoDeskAPI } from '../client/index.js';
import { resolveToken, toolResult } from './_helpers.js';

export function createMetaTools(api: ZohoDeskAPI) {
  return {
    list_organizations: {
      description: 'Lista las organizaciones de Zoho Desk accesibles con el token actual. Util cuando hay multiples orgs y quieres saber cual usar como org_id.',
      parameters: z.object({
        refresh_token: z.string().optional().describe('Override opcional del refresh token. Si no se pasa, usa el persistido.'),
      }),
      execute: async (args: { refresh_token?: string }) => {
        await resolveToken(api, args.refresh_token);
        const orgs = await api.organizations.listOrganizations();
        return toolResult(orgs);
      },
    },
  };
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: solo error en `oauth-cli.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/tools/meta.ts
git commit -m "feat(tools): agregar list_organizations en meta.ts"
```

---

## Task 9: Reescribir oauth-cli.ts

**Files:**
- Modify: `src/oauth-cli.ts`

**Por que:** El CLI actual importa `token-storage` (eliminado). Hay que adaptarlo a `secure-storage` con la misma logica funcional.

- [ ] **Step 1: Reemplazar el contenido completo**

```typescript
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
```

- [ ] **Step 2: Build (debe pasar limpio ya)**

Run: `npm run build`
Expected: build exitoso, sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/oauth-cli.ts
git commit -m "refactor(cli): oauth-cli usa secure-storage en lugar de token-storage

Persiste el refresh token en \$APPDATA/mcp_desk_docs/config.json (Windows)
o equivalente segun OS, en lugar del antiguo .zoho-desk-token en cwd.
Tambien valida que clientId y clientSecret esten configurados antes
de iniciar cualquier flujo."
```

---

## Task 10: Hacer refresh_token opcional en baseSchema

**Files:**
- Modify: `src/utils/schemas.ts:4-7`

**Por que:** Con el patron `resolveToken`, el `refresh_token` ya no es obligatorio en cada llamada. Lo dejamos opcional para retrocompatibilidad (la IA puede pasarlo si lo tiene).

- [ ] **Step 1: Editar baseSchema**

Reemplazar las lineas 3-7 de `src/utils/schemas.ts`:

```typescript
// Base schema con refresh_token y org_id opcionales (resueltos via resolveToken/resolveOrgId)
export const baseSchema = z.object({
  refresh_token: z.string().optional().describe('Override opcional del refresh token. Si no se pasa, se resuelve desde memoria del client o secure-storage.'),
  org_id: z.string().optional().describe('Override opcional del Organization ID. Si no se pasa, se resuelve desde memoria, secure-storage o auto-deteccion.'),
});
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 3: Commit**

```bash
git add src/utils/schemas.ts
git commit -m "refactor(schemas): refresh_token y org_id opcionales en baseSchema

Con el patron resolveToken/resolveOrgId, las credenciales se resuelven
automaticamente desde memoria/secure-storage. Si la IA quiere pasarlas
explicitamente como override, sigue siendo posible."
```

---

## Task 11: Adaptar tools/articles.ts a los helpers

**Files:**
- Modify: `src/tools/articles.ts` (reemplazar el patron `setToken` por `resolveToken`/`resolveOrgId`/`toolResult`)

**Por que:** Las tools deben usar los helpers nuevos. Esto es una adaptacion mecanica: reemplazar `setToken(args.refresh_token, args.org_id)` por `await resolveToken(...) + await resolveOrgId(...)`, y los `return { content: [...] }` por `return toolResult(...)`.

- [ ] **Step 1: Reemplazar imports y bloque setToken**

Editar `src/tools/articles.ts`. Cambiar las primeras lineas:

```typescript
import type { ZohoDeskAPI } from '../client/index.js';
import {
  listArticlesSchema,
  // ... resto de imports
} from '../utils/schemas.js';

export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
}

export function createArticleTools(api: ZohoDeskAPI) {
  const setToken = (refresh_token: string, org_id?: string) => {
    api.client.setRefreshToken(refresh_token);
    if (org_id) {
      api.client.setOrgId(org_id);
    }
  };
```

por:

```typescript
import type { ZohoDeskAPI } from '../client/index.js';
import {
  listArticlesSchema,
  // ... resto de imports
} from '../utils/schemas.js';
import { resolveToken, resolveOrgId, toolResult } from './_helpers.js';

export function createArticleTools(api: ZohoDeskAPI) {
```

- [ ] **Step 2: Reemplazar todos los `setToken(args.refresh_token, args.org_id)` por la pareja resolveToken/resolveOrgId**

Para cada tool definida en el archivo, donde diga:

```typescript
execute: async (args: any): Promise<ToolResult> => {
  setToken(args.refresh_token, args.org_id);
  // ... codigo de la tool
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
  };
}
```

cambiar a:

```typescript
execute: async (args: any) => {
  await resolveToken(api, args.refresh_token);
  await resolveOrgId(api, args.org_id);
  // ... codigo de la tool (sin cambios)
  return toolResult(result);
}
```

Hacer este reemplazo para **todas las tools** en `articles.ts` (~10 tools).

Tip: usar `replace_all: false` con cada bloque, no `replace_all` con la firma comun, porque cada tool puede tener nombres de variables internos distintos (`articles`, `article`, `result`, etc.).

- [ ] **Step 3: Eliminar la interface `ToolResult` no usada**

Si tras los cambios `ToolResult` ya no se referencia, eliminar las lineas:

```typescript
export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
}
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 5: Commit**

```bash
git add src/tools/articles.ts
git commit -m "refactor(tools): articles.ts usa resolveToken/resolveOrgId/toolResult

refresh_token y org_id ya no son obligatorios: si no se pasan, se
resuelven desde memoria del client, secure-storage o auto-deteccion."
```

---

## Task 12: Adaptar tools/categories.ts

**Files:**
- Modify: `src/tools/categories.ts`

**Por que:** Mismo refactor que articles.ts, aplicado a categories.

- [ ] **Step 1: Aplicar el mismo refactor que en Task 11 a categories.ts**

Patron identico: reemplazar `setToken` por `resolveToken`/`resolveOrgId`, y `return { content: [...] }` por `return toolResult(...)`.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: exitoso.

- [ ] **Step 3: Commit**

```bash
git add src/tools/categories.ts
git commit -m "refactor(tools): categories.ts usa resolveToken/resolveOrgId/toolResult"
```

---

## Task 13: Adaptar tools/sections.ts

**Files:**
- Modify: `src/tools/sections.ts`

- [ ] **Step 1: Mismo refactor que Task 11 aplicado a sections.ts**

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: exitoso.

- [ ] **Step 3: Commit**

```bash
git add src/tools/sections.ts
git commit -m "refactor(tools): sections.ts usa resolveToken/resolveOrgId/toolResult"
```

---

## Task 14: Adaptar tools/departments.ts

**Files:**
- Modify: `src/tools/departments.ts`

- [ ] **Step 1: Mismo refactor que Task 11 aplicado a departments.ts**

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: exitoso.

- [ ] **Step 3: Commit**

```bash
git add src/tools/departments.ts
git commit -m "refactor(tools): departments.ts usa resolveToken/resolveOrgId/toolResult"
```

---

## Task 15: Actualizar tools/index.ts

**Files:**
- Modify: `src/tools/index.ts`

**Por que:** `createOAuthTools` ahora acepta `(config, api)` en vez de `(config)`. Hay que registrar `createMetaTools` tambien.

- [ ] **Step 1: Reemplazar el contenido completo**

```typescript
import type { ZohoDeskAPI } from '../client/index.js';
import type { ZohoDeskConfig } from '../types/index.js';
import { createOAuthTools } from './oauth.js';
import { createArticleTools } from './articles.js';
import { createCategoryTools } from './categories.js';
import { createSectionTools } from './sections.js';
import { createDepartmentTools } from './departments.js';
import { createMetaTools } from './meta.js';

export function createAllTools(api: ZohoDeskAPI, config: ZohoDeskConfig) {
  return {
    ...createOAuthTools(config, api),
    ...createMetaTools(api),
    ...createArticleTools(api),
    ...createCategoryTools(api),
    ...createSectionTools(api),
    ...createDepartmentTools(api),
  };
}

export { createOAuthTools } from './oauth.js';
export { createMetaTools } from './meta.js';
export { createArticleTools } from './articles.js';
export { createCategoryTools } from './categories.js';
export { createSectionTools } from './sections.js';
export { createDepartmentTools } from './departments.js';
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: exitoso.

- [ ] **Step 3: Commit**

```bash
git add src/tools/index.ts
git commit -m "refactor(tools): pasar api a createOAuthTools y registrar meta"
```

---

## Task 16: Anadir instructions al server (Nivel 1 del manual)

**Files:**
- Modify: `src/index.ts`

**Por que:** El cliente MCP recibe `instructions` en el `initialize` response. Es texto que el cliente puede inyectar al system prompt. Aprovechamos para guiar el flujo OAuth y aclarar convenciones.

- [ ] **Step 1: Anadir el campo `instructions` al constructor del Server**

Editar `src/index.ts`. Cambiar el bloque del `new Server({...}, {...})`:

```typescript
const server = new Server(
  {
    name: 'zoho-desk-docs',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);
```

por:

```typescript
const server = new Server(
  {
    name: 'zoho-desk-docs',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
    instructions: [
      'MCP de Zoho Desk Knowledge Base: gestion de articulos, categorias, secciones y departamentos.',
      '',
      'Setup obligatorio antes de usar tools de dominio:',
      '1. zoho_setup(client_id, client_secret) - obten credenciales en https://api-console.zoho.com/',
      '2. zoho_connect() - autentica via OAuth (abre navegador). Auto-detecta orgId.',
      '',
      'Despues del setup, las tools de dominio (list_articles, list_categories, etc) funcionan',
      'sin pasar refresh_token ni org_id (se resuelven desde secure-storage automaticamente).',
      '',
      'Si necesitas inspeccionar configuracion: zoho_connection_status.',
      'Para ver organizaciones disponibles: list_organizations.',
      '',
      'Convenciones: IDs como string, fechas en ISO 8601, errores devueltos como Error con mensaje legible.',
    ].join('\n'),
  }
);
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: exitoso.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat(server): agregar instructions con guia rapida de setup OAuth

Texto entregado al cliente MCP en initialize response. Resume el flujo
zoho_setup -> zoho_connect y aclara que las tools de dominio resuelven
credenciales automaticamente."
```

---

## Task 17: Crear scripts/smoke-test.mjs

**Files:**
- Create: `scripts/smoke-test.mjs`
- Modify: `package.json` (anadir script `smoke`)

**Por que:** Validacion end-to-end contra credenciales reales. Es la unica prueba que importa para un MCP que es esencialmente un proxy HTTP.

- [ ] **Step 1: Anadir script al package.json**

Editar `package.json`. En el bloque `scripts`, anadir despues de `"test:coverage"`:

```json
"smoke": "npm run build && node scripts/smoke-test.mjs",
```

El bloque `scripts` debe quedar:

```json
"scripts": {
  "build": "tsc",
  "dev": "tsx watch src/index.ts",
  "start": "node dist/index.js",
  "oauth": "tsx src/oauth-cli.ts",
  "oauth:manual": "tsx src/oauth-cli.ts manual",
  "oauth:exchange": "tsx src/oauth-cli.ts exchange",
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage",
  "smoke": "npm run build && node scripts/smoke-test.mjs",
  "lint": "eslint src/**/*.ts",
  "lint:fix": "eslint src/**/*.ts --fix",
  "format": "prettier --write \"src/**/*.ts\"",
  "format:check": "prettier --check \"src/**/*.ts\""
}
```

- [ ] **Step 2: Crear el script smoke-test**

```javascript
#!/usr/bin/env node
/**
 * Smoke test end-to-end de mcp_desk_docs.
 *
 * Requisitos:
 * - Haber ejecutado zoho_setup + zoho_connect previamente (via MCP o CLI),
 *   o tener ZOHO_CLIENT_ID/SECRET/REFRESH_TOKEN en .env.
 *
 * Ejecuta una muestra representativa de tools y reporta OK/FAIL por tool.
 * Exit code 0 si todas pasan, 1 si alguna falla.
 */

import { loadConfig } from '../dist/utils/config.js';
import { ZohoDeskAPI } from '../dist/client/index.js';
import { createAllTools } from '../dist/tools/index.js';

const checks = [
  {
    name: 'zoho_connection_status',
    args: {},
    validate: (result) => {
      const text = result.content?.[0]?.text || '';
      if (!text.includes('Status: CONNECTED')) {
        throw new Error(`Esperaba CONNECTED, recibido: ${text.split('\n')[3] || text}`);
      }
    },
  },
  {
    name: 'list_organizations',
    args: {},
    validate: (result) => {
      const data = JSON.parse(result.content[0].text);
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Esperaba al menos 1 organizacion');
      }
    },
  },
  {
    name: 'list_departments',
    args: { from: 0, limit: 10 },
    validate: (result) => {
      const data = JSON.parse(result.content[0].text);
      if (!Array.isArray(data)) {
        throw new Error('Esperaba array de departamentos');
      }
    },
  },
  {
    name: 'list_articles',
    args: { from: 0, limit: 1 },
    validate: (result) => {
      const data = JSON.parse(result.content[0].text);
      if (!data || !('data' in data)) {
        throw new Error('Esperaba estructura con campo "data"');
      }
    },
  },
  {
    name: 'list_categories',
    args: { from: 0, limit: 1 },
    validate: (result) => {
      const data = JSON.parse(result.content[0].text);
      if (!data || !('data' in data)) {
        throw new Error('Esperaba estructura con campo "data"');
      }
    },
  },
  {
    name: 'list_sections',
    args: { from: 0, limit: 1, category_id: '' },
    validate: (result) => {
      // list_sections requiere category_id; si no hay categorias devolvera error.
      // Aceptamos tanto exito como error explicito de validacion.
      const text = result.content?.[0]?.text || '';
      if (text.length === 0) {
        throw new Error('Respuesta vacia');
      }
    },
    optional: true,
  },
];

async function main() {
  console.error('=== mcp_desk_docs smoke test ===\n');

  const config = await loadConfig();
  const api = new ZohoDeskAPI(config);
  const tools = createAllTools(api, config);

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const check of checks) {
    const tool = tools[check.name];
    if (!tool) {
      console.error(`[SKIP] ${check.name} - tool no registrada`);
      continue;
    }

    try {
      const validatedArgs = tool.parameters.parse(check.args);
      const result = await tool.execute(validatedArgs);
      check.validate(result);
      console.error(`[OK]   ${check.name}`);
      passed++;
    } catch (err) {
      const msg = err.message || String(err);
      if (check.optional) {
        console.error(`[WARN] ${check.name}: ${msg}`);
      } else {
        console.error(`[FAIL] ${check.name}: ${msg}`);
        failed++;
        failures.push({ name: check.name, error: msg });
      }
    }
  }

  console.error(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);

  if (failed > 0) {
    console.error('\nFallas:');
    failures.forEach(f => console.error(`  - ${f.name}: ${f.error}`));
    process.exit(1);
  }
  process.exit(0);
}

main().catch(err => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
```

- [ ] **Step 3: Ejecutar build y smoke**

Run: `npm run smoke`
Expected (si hay credenciales validas configuradas): salida con `[OK]` por cada tool y `=== Resultado: N OK, 0 FAIL ===`. Exit code 0.

Si no hay credenciales configuradas, el smoke fallara con mensaje de "Not authenticated" — eso indica que el flujo es correcto pero falta hacer `zoho_setup` + `zoho_connect` desde un cliente MCP o `npm run oauth`.

- [ ] **Step 4: Commit**

```bash
git add scripts/smoke-test.mjs package.json
git commit -m "test: agregar smoke-test end-to-end con credenciales reales

Ejecuta una muestra representativa de tools (status, organizations,
departments, articles, categories, sections) y reporta OK/FAIL por tool.
Es la unica validacion - sin tests unitarios mockeados.

Uso: npm run smoke (requiere zoho_setup + zoho_connect previo)."
```

---

## Task 18: Actualizar .gitignore y limpiar vestigios

**Files:**
- Modify: `.gitignore`

**Por que:** El antiguo `.zoho-desk-token` ya no se crea, pero podria existir en filesystems de devs. Ignorarlo evita commits accidentales.

- [ ] **Step 1: Verificar .gitignore actual**

Run: `cat .gitignore`

- [ ] **Step 2: Agregar entradas si faltan**

Anadir al final (si no estan ya):

```
# Vestigio del sistema viejo (reemplazado por secure-storage en %APPDATA%)
.zoho-desk-token
.zoho-token

# Local env
.env
```

- [ ] **Step 3: Commit (solo si hubo cambios)**

```bash
git add .gitignore
git commit -m "chore: ignorar vestigios de token-storage en .gitignore"
```

---

## Task 19: Actualizar README.md

**Files:**
- Modify: `README.md`

**Por que:** El README actual documenta el flujo viejo (refresh_token como parametro en cada llamada). Hay que actualizarlo al nuevo modelo.

- [ ] **Step 1: Leer README actual**

Run: `cat README.md`

- [ ] **Step 2: Actualizar las secciones relevantes**

Las secciones a reescribir o anadir:

1. **Setup**: Reemplazar "configura ZOHO_REFRESH_TOKEN en .env" por:
   ```
   ## Setup

   1. Crea una app OAuth en https://api-console.zoho.com/ (Server-based, redirect URI http://localhost:3000/callback).
   2. Configura Claude Desktop / Claude Code para cargar este MCP (ver `Configuracion del cliente MCP` abajo).
   3. Desde el cliente, ejecuta:
      ```
      zoho_setup(client_id="...", client_secret="...", region="com")
      zoho_connect()
      ```
   4. Listo. Las credenciales y orgId quedan persistidas en:
      - Windows: `%APPDATA%/mcp_desk_docs/config.json`
      - macOS: `~/Library/Application Support/mcp_desk_docs/config.json`
      - Linux: `$XDG_CONFIG_HOME/mcp_desk_docs/config.json`
   ```

2. **Tools**: Eliminar ejemplos donde se pasa `refresh_token` en cada llamada. Aclarar que es opcional.

3. **Comandos**: Mantener `npm run build`, `npm start`, `npm run oauth` (CLI alternativo). Anadir `npm run smoke`.

4. **Troubleshooting**:
   - "Not authenticated" -> ejecutar `zoho_setup` + `zoho_connect`.
   - Reset: `zoho_disconnect()` o borrar el `config.json` manualmente.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs(readme): actualizar setup al nuevo flujo OAuth con secure-storage

- Documenta zoho_setup + zoho_connect como flujo principal
- Indica ubicaciones de secure-storage por OS
- Aclara que refresh_token y org_id son opcionales en tools de dominio
- Anade troubleshooting basico y referencia a npm run smoke"
```

---

## Task 20: Validacion final end-to-end

**Por que:** Verificar que todo funciona junto: build limpio, server arranca con/sin credenciales, OAuth flow completo, smoke test pasa.

- [ ] **Step 1: Build completo desde cero**

Run: `rm -rf dist && npm run build`
Expected: build exitoso, sin warnings ni errores.

- [ ] **Step 2: Verificar server arranca SIN credenciales**

Borrar temporalmente el secure-storage para simular usuario nuevo:

```bash
# Windows (Git Bash):
mv "$APPDATA/mcp_desk_docs/config.json" "$APPDATA/mcp_desk_docs/config.json.backup" 2>/dev/null || true

# Iniciar server
npm start &
SERVER_PID=$!
sleep 2

# El server deberia haber arrancado y mostrado "ZOHO DESK MCP - SETUP REQUIRED" en stderr.
# Detener:
kill $SERVER_PID 2>/dev/null || true

# Restaurar:
mv "$APPDATA/mcp_desk_docs/config.json.backup" "$APPDATA/mcp_desk_docs/config.json" 2>/dev/null || true
```

Expected: el server arranca, en stderr aparece el banner SETUP REQUIRED, no se cae.

- [ ] **Step 3: Ejecutar el smoke test completo**

Run: `npm run smoke`
Expected: todos los checks pasan (`=== Resultado: N OK, 0 FAIL ===`).

- [ ] **Step 4: Verificar que las tools listadas son las correctas**

Levantar el server con MCP Inspector o un cliente similar y verificar que aparecen las tools nuevas:
- `zoho_setup`, `zoho_connect`, `zoho_disconnect`, `zoho_oauth_get_url`, `zoho_oauth_exchange_code`, `zoho_connection_status`
- `list_organizations`, `list_departments`, `get_department`
- Tools de articulos, categorias, secciones (~25 totales)

NO deben aparecer: `zoho_desk_connect`, `zoho_desk_oauth_init`, `zoho_desk_oauth_get_url`, `zoho_desk_oauth_exchange_code`, `zoho_desk_connection_status` (las antiguas).

- [ ] **Step 5: Commit final si hay tweaks**

Si en la validacion encontraste pequenos ajustes (typos, mensajes), commit:

```bash
git add -A
git commit -m "fix: ajustes finales de validacion end-to-end"
```

- [ ] **Step 6: Push de la rama dev**

```bash
git push origin dev
```

Expected: push exitoso. Listo para PR a `main` (manual, no automatizado).

---

## Notas de implementacion

- **Orden de tasks**: estricto. Cada task asume que las anteriores estan en HEAD.
- **Build entre tasks 3 y 9**: el build romperia entre estas tasks por el import faltante en `oauth-cli.ts`. Se asume y se resuelve en Task 9.
- **Sin TDD literal**: este MCP es esencialmente un proxy HTTP. La validacion real es el smoke test contra Zoho. Tests unitarios mockeando axios solo verificarian que llamamos bien a axios, no que Zoho responde como esperamos.
- **Para implementar**: usar `superpowers:subagent-driven-development` con un subagente fresco por task. La revision entre tasks captura desviaciones del plan.

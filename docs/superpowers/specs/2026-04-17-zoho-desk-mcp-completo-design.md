# Diseno: Modernizar mcp_desk_docs (Knowledge Base)

**Fecha:** 2026-04-17
**Autor:** Julio Diaz (con Claude Opus 4.7)
**Estado:** Aprobado para implementacion
**Repo:** `E:\DinamicAPPS\github\mcp_desk_docs`
**Branch base:** `dev`

---

## 1. Contexto

`mcp_desk_docs` es el MCP de la familia Zoho Desk dedicado a gestion de Knowledge Base (articulos, categorias, secciones, departamentos). El alcance se mantiene **acotado a KB** — la gestion de tickets y reportes se moveran a MCPs separados (`mcp_desk_tickets`, `mcp_desk_reports`) en repos independientes.

El problema actual es que el MCP no esta alineado con el patron de OAuth y persistencia de credenciales que ya usan el resto de MCPs Zoho de la organizacion (`mcp-zoho-project`, `mcp-zoho-cliq`, `mcp_zoho_sprints`):

- Exige pasar `refresh_token` y `org_id` como parametros en cada llamada.
- `loadConfig` lanza error si faltan credenciales (rompe el modo setup).
- No persiste el refresh token (solo guardado en `.zoho-desk-token` con `loadRefreshToken` deshabilitado).
- Sus tools OAuth (`zoho_desk_connect`, `zoho_desk_oauth_*`) devuelven el token al chat para que el usuario lo pegue manualmente.

Este spec moderniza `mcp_desk_docs` adoptando el patron de `mcp-zoho-project` sin expandir el alcance funcional. La gestion de tickets y reportes seran proyectos separados, cada uno con su propio repo, su propio secure-storage y su propio OAuth.

## 2. Objetivo

Convertir `mcp_desk_docs` en un MCP autocontenido para Zoho Desk Knowledge Base, alineado al patron OAuth/persistencia ya validado en `mcp-zoho-project`. El MCP debe:

1. Mantener el alcance actual: articulos, categorias, secciones, departamentos (lectura).
2. Persistir credenciales en secure-storage (`%APPDATA%/mcp_desk_docs/config.json`) con tools `zoho_setup`/`zoho_connect`/`zoho_disconnect`/`zoho_connection_status`.
3. Auto-detectar `orgId` tras OAuth via `/organizations` y persistirlo.
4. Hacer `refresh_token` y `org_id` **opcionales** en todas las tools de dominio (resueltos desde memoria/storage).
5. Validar funcionamiento end-to-end via smoke test contra credenciales reales.
6. Servir como **referencia base** para los proximos MCPs de la familia Desk (`mcp_desk_tickets`, `mcp_desk_reports`).

## 3. Arquitectura

### 3.1 Estructura de carpetas

```
src/
  index.ts                          # Entry point
  oauth-cli.ts                      # CLI de OAuth (persiste en secure-storage)
  client/
    index.ts                        # ZohoDeskAPI (facade)
    zoho-client.ts                  # HTTP client (cola, rate limit, refresh)
    services/
      articles.ts                   # KB - articulos (ya existe)
      categories.ts                 # KB - categorias (ya existe)
      sections.ts                   # KB - secciones (ya existe)
      departments.ts                # Departments lectura (ya existe)
      organizations.ts              # NUEVO: list (para auto-detect orgId)
  tools/
    _helpers.ts                     # NUEVO: resolveToken, resolveOrgId, toolResult
    oauth.ts                        # REESCRITO: zoho_setup/connect/disconnect/etc.
    articles.ts                     # ADAPTADO: usa _helpers, refresh_token opcional
    categories.ts                   # ADAPTADO
    sections.ts                     # ADAPTADO
    departments.ts                  # ADAPTADO
    meta.ts                         # NUEVO: list_organizations
    index.ts                        # createAllTools(api, config)
  types/
    index.ts                        # Tipos compartidos (ya existe, con ajustes menores)
  utils/
    config.ts                       # REESCRITO: tolerante a credenciales faltantes
    secure-storage.ts               # NUEVO: reemplaza token-storage.ts
    oauth-helpers.ts                # Sin cambios
    schemas.ts                      # AJUSTADO: refresh_token y org_id opcionales en baseSchema
docs/
  superpowers/specs/
    2026-04-17-zoho-desk-mcp-completo-design.md  # Este documento
scripts/
  smoke-test.mjs                    # NUEVO: end-to-end con credenciales reales
```

**Archivos eliminados:** `src/utils/token-storage.ts` (reemplazado por `secure-storage.ts`).

### 3.2 OAuth y persistencia

Identico al patron de `mcp-zoho-project`:

1. `secure-storage.ts` guarda `{clientId, clientSecret, region, oauthScopes, refreshToken, orgId, configuredAt, lastTokenRefresh}` en `%APPDATA%/mcp_desk_docs/config.json` (Windows) / `~/Library/Application Support/mcp_desk_docs/config.json` (macOS) / `$XDG_CONFIG_HOME/mcp_desk_docs/config.json` (Linux). Permisos 0600 en Unix.
2. `loadConfig` fusiona env vars + secure-storage. **Si faltan credenciales no lanza error** — deja que el server arranque en modo setup (solo OAuth tools funcionales).
3. `zoho_setup(client_id, client_secret, region?, scopes?)` persiste credenciales. Sustituye a la antigua estrategia de configurar via env vars.
4. `zoho_connect()` ejecuta OAuth flow (abre navegador, captura code, intercambia por refresh token). Persiste el refresh token y llama `autoDetectOrgId(api)` que invoca `/organizations` y guarda el orgId default.
5. `zoho_disconnect()` borra el archivo de config.
6. `zoho_connection_status()` reporta estado (configured / authenticated / connected) + scopes + orgId + ruta del config dir.
7. `zoho_oauth_get_url(scopes?)` y `zoho_oauth_exchange_code(code)` para el flujo manual paso a paso.

### 3.3 Helpers `_helpers.ts`

```ts
export async function resolveToken(api: ZohoDeskAPI, paramToken?: string): Promise<void>
export async function resolveOrgId(api: ZohoDeskAPI, paramOrgId?: string): Promise<string>
export function toolResult(data: unknown): { content: [{type: 'text', text: string}] }
```

Orden de resolucion:
- **Token**: param > memoria del client > secure-storage > error.
- **OrgId**: param > memoria del client > secure-storage > auto-detect via `/organizations` > error.

Todas las tools de dominio empiezan con:
```ts
await resolveToken(api, args.refresh_token);
const orgId = await resolveOrgId(api, args.org_id);
```

`refresh_token` y `org_id` quedan opcionales en los schemas (override explicito si se pasa).

### 3.4 ZohoDeskClient (cambios)

Mantener mecanica actual (cola serializada, rate limit 500ms, refresh mutex, interceptors 401/403). Cambios:

- Importar `saveRefreshToken` desde `secure-storage` (no `token-storage`).
- Agregar `setOrgId(id)`, `getOrgId()` para que las tools puedan ajustar el orgId en runtime.
- Agregar `transformResponse` para preservar IDs grandes como string (defensa contra perdida de precision en JSON.parse de enteros >=16 digitos — Zoho Desk devuelve algunos IDs largos).

**No se necesita** multipart/form-data ni getBuffer — KB no maneja attachments. Esa funcionalidad ira en `mcp_desk_tickets`.

### 3.5 Servicio `organizations`

Nuevo archivo `src/client/services/organizations.ts`:

```ts
class OrganizationsService {
  constructor(private _client: ZohoDeskClient) {}
  async listOrganizations(): Promise<ZohoDeskOrganization[]>
}
```

Endpoint: `GET /api/v1/organizations`. Devuelve las orgs accesibles con el token actual. Usado por `autoDetectOrgId` y expuesto como tool `list_organizations` (para que el usuario pueda inspeccionar orgs disponibles).

## 4. Flujo de datos

**Setup inicial:**
```
IA -> zoho_setup(client_id, client_secret, region?)
   -> secure-storage.saveConfig(...)
   -> respuesta: "Next: zoho_connect"
```

**Autenticacion:**
```
IA -> zoho_connect()
   -> executeOAuthFlow() abre navegador
   -> captura code -> intercambia por refresh_token
   -> secure-storage.saveRefreshToken(rt)
   -> autoDetectOrgId(api): listOrganizations() -> primera org -> save
   -> respuesta: "OK, orgId X auto-detectado"
```

**Tool de dominio normal:**
```
IA -> list_articles({limit: 10})
   -> resolveToken(api, undefined) -> memoria
   -> resolveOrgId(api, undefined) -> memoria
   -> api.articles.listArticles(...)
   -> toolResult(data)
```

**Override explicito (si se necesita):**
```
IA -> list_articles({refresh_token: "xxx", org_id: "yyy", limit: 10})
   -> resolveToken usa param
   -> resolveOrgId usa param
```

**Sin credenciales:**
```
loadConfig() -> ambos vacios, no lanza error
IA -> list_articles()
   -> resolveToken lanza "Not authenticated. Use zoho_setup + zoho_connect"
IA -> zoho_setup(...) -> funciona
```

## 5. Manejo de errores

- Interceptors actuales del `ZohoDeskClient` se conservan (refresh + retry en 401/403, formato unificado de error).
- `resolveToken`/`resolveOrgId` lanzan mensajes amigables con la accion correctiva ("usa zoho_setup", "usa zoho_connect").
- Errores Zoho con `errorCode` en body se traducen a `Error` con mensaje legible.

## 6. Testing

**Smoke test end-to-end** (`scripts/smoke-test.mjs`):

- Importa `loadConfig`, `ZohoDeskAPI`, `createAllTools` directamente (sin transport stdio).
- Asume credenciales validas en secure-storage (usuario ya ejecuto `zoho_setup` + `zoho_connect` al menos una vez).
- Ejecuta:
  1. `zoho_connection_status()` -> reporta CONNECTED.
  2. `list_organizations()` -> al menos 1 org.
  3. `list_departments({limit: 10})` -> array.
  4. `list_articles({limit: 1})` -> array `data` (puede estar vacio).
  5. `list_categories({limit: 1})` -> array.
  6. `list_sections({limit: 1})` -> array.
- Reporta `[OK] toolName` o `[FAIL] toolName: <error>`.
- Exit code 0 si todos pasan, 1 si alguno falla.

**Script:** `npm run smoke` (anadir a `package.json`).

**No hay tests unitarios.** Para un MCP cuyo trabajo es proxiar HTTP a Zoho, mockear axios verifica que llamamos bien — no que Zoho responde como esperamos. El smoke real cubre lo que importa.

## 7. Tools expuestas (lista final)

**OAuth (6):**
- `zoho_setup`
- `zoho_connect`
- `zoho_disconnect`
- `zoho_connection_status`
- `zoho_oauth_get_url`
- `zoho_oauth_exchange_code`

**Meta (2):**
- `list_organizations`
- `list_departments` / `get_department`

**Articles (~10):**
- `list_articles`, `get_article`, `create_article`, `update_article`, `delete_article`, `search_articles`, `move_articles`, `list_translations`, `add_translation`, `update_translation`, `delete_translation`

**Categories (~5):**
- `list_categories`, `get_category`, `create_category`, `update_category`, `delete_category`

**Sections (~5):**
- `list_sections`, `get_section`, `create_section`, `update_section`, `delete_section`

**Total:** ~28 tools — dentro del sweet spot recomendado por la evidencia (30-50).

## 8. Que NO se incluye en este spec

- **Gestion de tickets** (CRUD, threads, comments, attachments, tags, resolution, contacts, history) — va en `mcp_desk_tickets` (repo separado, spec propio).
- **Reportes y stats** (metrics, count, happiness, resolution_time) — va en `mcp_desk_reports` (repo separado, spec propio).
- **Toolsets opt-in** / **patron workflow** / **tool routers** — el alcance acotado a KB no requiere optimizaciones de tool count.
- **MCPB packaging** (`manifest.json`) — fase 2 opcional, no bloqueante.
- **Tests unitarios** — explicitamente fuera (smoke test cubre lo que importa para un proxy HTTP).
- **Storage compartido entre los 3 MCPs Desk** — decision explicita: cada MCP independiente, su propio secure-storage, su propio OAuth.

## 9. Criterios de aceptacion

1. `npm run build` compila sin errores.
2. Server arranca sin credenciales (modo setup), expone solo tools `oauth_*`.
3. `zoho_setup` + `zoho_connect` flujo end-to-end funciona en navegador, persiste credenciales y orgId.
4. `npm run smoke` pasa los 6 checks contra una org Zoho Desk real.
5. Todas las tools de dominio funcionan **sin** pasar `refresh_token` ni `org_id` despues de un `zoho_connect` exitoso.
6. README.md actualizado: nueva configuracion para Claude Desktop, comandos de OAuth, troubleshooting.
7. `src/utils/token-storage.ts` eliminado del repo.

## 10. Plan de continuidad para los otros MCPs Desk

Una vez validado este spec en `mcp_desk_docs`, los otros dos MCPs reutilizan:

- **`secure-storage.ts`** (mismo codigo, solo cambia `APP_NAME`).
- **`_helpers.ts`** (identico).
- **`ZohoDeskClient`** base (mismo, posiblemente con extensiones para multipart en el de tickets).
- **Patron OAuth** (mismas tools `zoho_setup/connect/disconnect/...`).
- **Smoke test pattern**.

Los 3 MCPs comparten: mismo `client_id`/`client_secret` en Zoho Developer Console (1 app OAuth registrada), pero **secure-storage independiente** — cada uno gestiona su propio refresh token. El usuario ejecuta `zoho_setup` + `zoho_connect` por separado en cada MCP.

## 11. Referencias

- `E:\DinamicAPPS\github\mcp-zoho-project\` — patron base de OAuth y secure-storage.
- `Zoho Desk API Documentation.html` (raiz del repo) — endpoints de KB.
- [Anthropic - Writing tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents).

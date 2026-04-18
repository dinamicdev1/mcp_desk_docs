# Diseno: MCP Zoho Desk completo (KB + Soporte + Stats)

**Fecha:** 2026-04-17
**Autor:** Julio Diaz (con Claude Opus 4.7)
**Estado:** Aprobado para implementacion
**Repo:** `E:\DinamicAPPS\github\mcp_desk_docs`
**Branch base:** `dev`

---

## 1. Contexto y problema

`mcp_desk_docs` hoy expone solo Knowledge Base de Zoho Desk (~25 tools) y exige pasar `refresh_token` y `org_id` en cada llamada. El resto de MCPs Zoho de la organizacion (`mcp-zoho-project`, `mcp-zoho-cliq`, `mcp_zoho_sprints`) ya migraron a un patron mas moderno: persistencia de credenciales en secure-storage, autodeteccion del recurso default tras OAuth, y resolucion implicita del token desde memoria/storage.

Ademas, se quiere ampliar el alcance del MCP a operaciones de soporte (tickets, threads, comments, attachments, tags, resolution, contacts, history, departamentos y stats), llegando a ~70 operaciones totales. Una expansion ingenua (1 tool por operacion) sobrepasaria el sweet spot de 30-50 tools por MCP y degradaria la precision de seleccion del modelo (Anthropic Tool Search reporta 34-64% accuracy con miles de tools; estudios independientes como Stacklok 2026-01 confirman degradacion notable a partir de 50+ tools).

El patron objetivo elegido — basado en evidencia de produccion de **GitHub MCP Server** (~90 tools agrupadas en toolsets opt-in) y **Harness MCP** (30 toolsets, 139 resource types) — es **toolsets agrupados por dominio con activacion opt-in via variable de entorno**.

## 2. Objetivo

Convertir `mcp_desk_docs` en el MCP Zoho Desk completo de la organizacion, alineado al patron OAuth de `mcp-zoho-project` y organizado por toolsets opt-in para mantener el contexto del modelo en el sweet spot. El MCP debe:

1. Cubrir KB + tickets + threads + comments + attachments + tags + resolution + contacts + history + departamentos + stats.
2. Persistir credenciales en secure-storage (`%APPDATA%/mcp_desk_docs/config.json`) con tools `zoho_setup`/`zoho_connect`/`zoho_disconnect`/`zoho_connection_status`.
3. Auto-detectar `orgId` tras OAuth via `/organizations` y persistirlo.
4. Permitir activar/desactivar toolsets via env var `ZOHO_DESK_TOOLSETS` (default razonable, `all` opcional).
5. Validar funcionamiento end-to-end via smoke test contra credenciales reales.
6. Servir como **referencia replicable** para alinear el resto de MCPs Zoho.

## 3. Arquitectura

### 3.1 Estructura de carpetas

```
src/
  index.ts                          # Entry point, lee ZOHO_DESK_TOOLSETS
  oauth-cli.ts                      # CLI de OAuth (persiste en secure-storage)
  client/
    index.ts                        # ZohoDeskAPI (facade con todos los servicios)
    zoho-client.ts                  # HTTP client (cola, rate limit, refresh, multipart)
    services/
      articles.ts                   # KB - articulos
      categories.ts                 # KB - categorias
      sections.ts                   # KB - secciones
      tickets.ts                    # Tickets CRUD + search + close
      threads.ts                    # Replies, forwards, drafts
      comments.ts                   # Notas internas
      attachments.ts                # Multipart upload, download, delete
      tags.ts                       # Tags globales y por ticket
      resolution.ts                 # CRUD de resolution
      contacts.ts                   # CRUD + search
      history.ts                    # Timeline de ticket
      stats.ts                      # Metrics, count, happiness, resolution_time
      departments.ts                # List/get
      organizations.ts              # List (para auto-detect orgId)
  tools/
    _helpers.ts                     # resolveToken, resolveOrgId, toolResult
    _toolsets.ts                    # Registry de toolsets y filtro por env
    oauth.ts                        # toolset 'oauth'
    meta.ts                         # toolset 'meta' (list_organizations, departments)
    kb.ts                           # toolset 'kb' (articles, categories, sections)
    tickets.ts                      # toolset 'tickets'
    threads.ts                      # toolset 'threads'
    comments.ts                     # toolset 'comments'
    attachments.ts                  # toolset 'attachments'
    tags.ts                         # toolset 'tags'
    resolution.ts                   # toolset 'resolution'
    contacts.ts                     # toolset 'contacts'
    history.ts                      # toolset 'history'
    stats.ts                        # toolset 'stats'
    index.ts                        # createAllTools(api, config) con filtro por toolset
  types/
    index.ts                        # Tipos compartidos
    desk.ts                         # Tipos especificos Zoho Desk
  utils/
    config.ts                       # loadConfig (env + secure-storage, tolerante)
    secure-storage.ts               # Reemplaza token-storage.ts
    oauth-helpers.ts                # Sin cambios estructurales
    schemas.ts                      # Schemas Zod por endpoint
docs/
  superpowers/specs/
    2026-04-17-zoho-desk-mcp-completo-design.md  # Este documento
scripts/
  smoke-test.mjs                    # End-to-end con credenciales reales
manifest.json                       # MCPB manifest (fase 2, opcional)
```

### 3.2 Toolsets

**12 toolsets, agrupados por dominio:**

| Toolset | Tools incluidas | Default activo |
|---|---|---|
| `oauth` | `zoho_setup`, `zoho_connect`, `zoho_disconnect`, `zoho_connection_status`, `zoho_oauth_get_url`, `zoho_oauth_exchange_code` | **Si (siempre)** |
| `meta` | `list_organizations`, `list_departments`, `get_department` | **Si** |
| `kb` | `list_articles`, `get_article`, `create_article`, `update_article`, `delete_article`, `search_articles`, `list_categories`, `get_category`, `list_sections`, `get_section`, `move_articles`, `add_translation`, `list_translations` | Si |
| `tickets` | `list_tickets`, `get_ticket`, `create_ticket`, `update_ticket`, `delete_ticket`, `close_ticket`, `search_tickets`, `assign_ticket` | Si |
| `threads` | `list_threads`, `get_thread`, `send_reply`, `forward_thread`, `add_draft_reply` | No |
| `comments` | `list_comments`, `get_comment`, `add_comment`, `update_comment`, `delete_comment` | No |
| `attachments` | `list_ticket_attachments`, `upload_attachment`, `download_attachment`, `delete_attachment` | No |
| `tags` | `list_tags`, `add_tags_to_ticket`, `remove_tags_from_ticket`, `list_ticket_tags` | No |
| `resolution` | `get_resolution`, `add_resolution`, `update_resolution`, `delete_resolution` | No |
| `contacts` | `list_contacts`, `get_contact`, `create_contact`, `update_contact`, `delete_contact`, `search_contacts` | No |
| `history` | `get_ticket_history` | No |
| `stats` | `get_ticket_metrics`, `get_tickets_count`, `get_agent_happiness`, `get_resolution_time` | No |

**Total operaciones:** ~70. **Default activo:** `oauth + meta + kb + tickets` ≈ 30 tools (en sweet spot).

### 3.3 Configuracion de toolsets

Variable de entorno `ZOHO_DESK_TOOLSETS`:
- `all` → todos los toolsets activos.
- Lista CSV → solo los listados (mas `oauth` que se fuerza siempre): ej. `oauth,kb,tickets,threads,comments`.
- No definida → default sensato: `oauth,meta,kb,tickets`.

`oauth` se fuerza activo siempre (es la unica forma de configurar el resto). El filtro vive en `src/tools/_toolsets.ts`:

```ts
export const ALL_TOOLSETS = [
  'oauth', 'meta', 'kb', 'tickets', 'threads', 'comments',
  'attachments', 'tags', 'resolution', 'contacts', 'history', 'stats',
] as const;

export function activeToolsets(): Set<string> {
  const raw = process.env.ZOHO_DESK_TOOLSETS?.trim();
  if (!raw) return new Set(['oauth', 'meta', 'kb', 'tickets']);
  if (raw === 'all') return new Set(ALL_TOOLSETS);
  const set = new Set(raw.split(',').map(s => s.trim()));
  set.add('oauth');
  return set;
}
```

`createAllTools` consulta este set y solo registra los grupos activos.

### 3.4 OAuth y persistencia

Identico a `mcp-zoho-project`:

1. `secure-storage.ts` guarda `{clientId, clientSecret, region, oauthScopes, refreshToken, orgId}` en JSON con permisos 0600 (Unix).
2. `loadConfig` fusiona env + secure-storage; si faltan credenciales **no lanza error**, deja que el server arranque en modo setup.
3. `zoho_setup(client_id, client_secret, region?)` persiste credenciales.
4. `zoho_connect()` ejecuta OAuth flow, persiste refresh_token, llama `autoDetectOrgId(api)` que invoca `/organizations` y guarda el orgId.
5. `zoho_disconnect()` limpia el archivo de config.
6. `zoho_connection_status()` reporta estado completo.

### 3.5 Helpers `_helpers.ts`

```ts
export async function resolveToken(api: ZohoDeskAPI, paramToken?: string): Promise<void>
export async function resolveOrgId(api: ZohoDeskAPI, paramOrgId?: string): Promise<string>
export function toolResult(data: unknown): { content: [{type: 'text', text: string}] }
```

Todas las tools de dominio empiezan con:
```ts
await resolveToken(api, args.refresh_token);
const orgId = await resolveOrgId(api, args.org_id);
```

`refresh_token` y `org_id` quedan **opcionales** en los schemas (override explicito si se quiere).

### 3.6 ZohoDeskClient

Mantener mecanica actual (cola serializada, rate limit 500ms, refresh mutex, interceptors 401/403). **Cambios menores:**

- Importar `saveRefreshToken` desde `secure-storage` (no `token-storage`).
- Anadir `setOrgId(id)`, `getOrgId()`, `setDefaultOrgId(id)`, `getDefaultOrgId()`.
- Anadir `postForm<T>(path, formData)` para multipart (attachments). Dependencia nueva: `form-data`.
- Anadir `getBuffer(path)` para descargar attachments (`responseType: 'arraybuffer'`).
- Anadir `transformResponse` para preservar IDs grandes como string (defensa contra perdida de precision en JSON.parse de enteros >=16 digitos).

## 4. Flujo de datos

**Setup inicial:**
```
IA → zoho_setup(client_id, client_secret, region?)
   → secure-storage.saveConfig(...)
   → respuesta: "Next: zoho_connect"
```

**Autenticacion:**
```
IA → zoho_connect()
   → executeOAuthFlow() abre navegador
   → captura code → intercambia por refresh_token
   → secure-storage.saveRefreshToken(rt)
   → autoDetectOrgId(api) → list_organizations → guarda orgId
   → respuesta: "OK, orgId X"
```

**Tool de dominio normal:**
```
IA → list_tickets(filters)
   → resolveToken(api, undefined) → memoria
   → resolveOrgId(api, undefined) → memoria
   → api.tickets.list(orgId, filters)
   → toolResult(data)
```

**Override explicito:**
```
IA → list_tickets({refresh_token: "xxx", org_id: "yyy", ...filters})
   → resolveToken usa param
   → resolveOrgId usa param
```

**Sin credenciales:**
```
IA → list_tickets()
   → resolveToken lanza "Not authenticated. Use zoho_setup + zoho_connect"
```

## 5. Manejo de errores

- Interceptors actuales del `ZohoDeskClient` se conservan (refresh + retry en 401/403, formato unificado de error).
- `resolveToken`/`resolveOrgId` lanzan mensajes amigables con la accion correctiva ("usa zoho_setup", "usa zoho_connect").
- Errores Zoho con `errorCode` en body se traducen a `Error` con mensaje legible.

## 6. Testing

**Smoke test end-to-end** (`scripts/smoke-test.mjs`):

- Importa `loadConfig`, `ZohoDeskAPI`, `createAllTools` directamente (sin transport stdio).
- Asume credenciales validas en secure-storage o `.env`.
- Ejecuta una muestra representativa, una tool por toolset:
  1. `zoho_connection_status` → estado CONNECTED.
  2. `list_organizations` → al menos 1 org.
  3. `list_departments` → al menos 1 depto.
  4. `list_articles({limit: 1})` → array `data`.
  5. `list_tickets({limit: 1})` → array `data`.
  6. `list_contacts({limit: 1})` → array `data`.
  7. `get_tickets_count({})` → numero entero.
- Reporta `[OK] toolName` o `[FAIL] toolName: <error>`.
- Exit code 0/1.

**Script:** `npm run smoke` (anadir a `package.json`).

**No hay tests unitarios.** Decision tomada: para un MCP cuyo trabajo es proxiar HTTP a Zoho, mockear axios verifica que llamamos bien — no que Zoho responde como esperamos. El smoke real cubre lo que importa.

## 7. Manual del MCP (3 niveles)

### Nivel 1 — Server `instructions` (siempre visible al cliente MCP)

Texto corto entregado en el `initialize` response:

> "MCP de Zoho Desk: gestion completa de Knowledge Base y soporte (tickets, threads, contacts, stats). Antes de usar cualquier tool de dominio, configura credenciales con `zoho_setup` (client_id + client_secret de api-console.zoho.com) y autentica con `zoho_connect`. El refresh token y orgId se persisten automaticamente. Activa toolsets adicionales via env `ZOHO_DESK_TOOLSETS=all` o lista CSV (default: `oauth,meta,kb,tickets`). Convenciones: IDs como string, fechas en ISO 8601 UTC."

### Nivel 2 — Description de `zoho_connection_status`

Aprovecha esta tool (que la IA suele invocar al iniciar) para incluir en su description un mini-tutorial: cuales son los toolsets disponibles, ejemplos de uso comun, troubleshooting basico.

### Nivel 3 — README.md exhaustivo

Manual completo con: ejemplos end-to-end, troubleshooting OAuth, tabla de toolsets, configuracion para Claude Desktop / Claude Code, FAQ. **No** se expone como MCP resource (Claude Desktop aun no lo soporta bien); vive como README del repo.

## 8. Que NO se incluye en este spec

- Patron workflow (DinamicCOM-style) — descartado por falta de benchmark publico, doble fuente de verdad, anti-patron frente al SDK MCP.
- Anthropic Tool Search Tool — descartado por accuracy 34-64% medido independientemente.
- Code Execution con MCP — descartado por lock-in a Claude Code (rompe Cursor, Cline, Claude Desktop).
- Multiples MCPs separados — descartado porque al cargarlos juntos pierdes el ahorro y multiplicas mantenimiento.
- MCPB packaging (`manifest.json`) — fase 2 opcional, no bloqueante para v1.
- Tests unitarios — explicitamente fuera (smoke test cubre lo que importa para un proxy HTTP).
- Migracion de los demas MCPs (Mail, Cliq, Sprints, Project) al patron toolsets — fuera del alcance de este spec; se hara despues de validar este.

## 9. Criterios de aceptacion

1. `npm run build` compila sin errores.
2. Server arranca sin credenciales (modo setup), expone solo `oauth` + tools que no requieren auth.
3. Server con credenciales completas expone los toolsets activos segun `ZOHO_DESK_TOOLSETS`.
4. `zoho_setup` + `zoho_connect` flujo end-to-end funciona en navegador, persiste credenciales y orgId.
5. `npm run smoke` pasa los 7 checks contra una org Zoho Desk real.
6. Las tools de dominio funcionan **sin** pasar `refresh_token` ni `org_id` despues de un `zoho_connect` exitoso.
7. README.md actualizado con tabla de toolsets, ejemplos, configuracion Claude Desktop.

## 10. Referencias

- `E:\DinamicAPPS\github\mcp-zoho-project\` — patron base de OAuth y secure-storage.
- `E:\DinamicAPPS\github\mcp-zoho-cliq\` — patron de multipart con `form-data`.
- `Zoho Desk API Documentation.html` (raiz del repo) — especificacion completa de endpoints.
- [GitHub MCP Server config](https://github.com/github/github-mcp-server/blob/main/docs/server-configuration.md) — modelo de toolsets opt-in.
- [Anthropic - Writing tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents).
- [Stacklok benchmark Tool Search](https://stacklok.com/blog/stackloks-mcp-optimizer-vs-anthropics-tool-search-tool-a-head-to-head-comparison).

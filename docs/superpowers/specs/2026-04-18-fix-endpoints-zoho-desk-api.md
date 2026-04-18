# Diseno: Fix completo de endpoints Zoho Desk API

**Fecha:** 2026-04-18
**Autor:** Julio Diaz (con Claude Opus 4.7)
**Estado:** Aprobado para implementacion
**Repo:** `E:\DinamicAPPS\github\mcp_desk_docs`
**Branch base:** `dev`

---

## 1. Contexto

Tras la modernizacion OAuth/secure-storage del spec `2026-04-17-zoho-desk-mcp-completo-design.md`, el smoke test end-to-end detecto dos bugs pre-existentes en el cliente HTTP:

1. `from: 0` como default en schemas viola el contrato del API (algunos endpoints exigen `>0`).
2. Endpoint `/kbCategories` devuelve 404 — el path correcto es `/kbRootCategories`.

Una **auditoria completa** de `src/client/services/*.ts` contra `Zoho Desk API Documentation.html` (fuente de verdad oficial) revelo que los bugs son sintomas de un problema mas amplio: aproximadamente **20 endpoints rotos** distribuidos en 3 servicios, con varios cambios de contrato que requieren modificar la firma publica de las tools MCP.

El MCP esta **solo en prototipado**, no en produccion — el usuario autorizo breaking changes directos sin capa de compatibilidad.

## 2. Objetivo

Corregir todos los endpoints incorrectos detectados en la auditoria, renombrar tools donde el contrato HTTP cambia, y eliminar metodos/tools que apuntan a endpoints inexistentes en la API actual de Zoho Desk. Tras este fix, las tools expuestas por el MCP deben corresponder 1:1 a endpoints reales y funcionales.

## 3. Alcance

### 3.1 Fix de paths incorrectos (sin cambio de contrato publico)

**`src/client/services/categories.ts`**
- `listRootCategories`, `getRootCategory`, `createRootCategory`, `updateRootCategory`, `moveRootCategoryToTrash`:
  path `/kbCategories*` -> `/kbRootCategories*`.
- `getCategoryTree`: path `/categories/{id}/tree` -> `/kbRootCategories/{rootId}/categoryTree`.
  Cambia el parametro: ahora recibe `rootCategoryId`.

**`src/client/services/articles.ts`**
- `searchArticles`: path `/kbArticles/search` -> `/articles/search`.
- `checkPermalink`: `GET /articles/permaLink` -> `POST /articles/checkPermalinkAvailability`.
- `restoreFromTrash`: `POST /articles/restore` -> `POST /recycleBin/restore` con body `{moduleType: 'articles', ids: [...]}`.
- `deleteArticles`: `POST /articles/delete` -> `POST /recycleBin/delete` con body `{moduleType: 'articles', ids: [...]}`.

**`src/client/services/sections.ts`**
- Migrar jerarquia anidada a endpoints planos `/kbSections`:
  - `listSections(categoryId)` -> `GET /kbSections?categoryId={id}`.
  - `getSection(sectionId)` -> `GET /kbSections/{sectionId}`.
  - `createSection(categoryId, payload)` -> `POST /kbSections` con `categoryId` en body.
  - `updateSection(sectionId, payload)` -> `PATCH /kbSections/{sectionId}`.
  - `moveSectionToTrash(sectionId)` -> `POST /kbSections/{sectionId}/moveToTrash`.

### 3.2 Fix de contrato API (breaking change)

El modelo real de Zoho Desk: **traducciones, adjuntos, like/dislike viven bajo `/articles/{id}/translations/{locale}`**, no bajo el articulo raiz. Las tools afectadas cambian su firma:

- `get_translation(article_id, translation_id)` -> `get_translation(article_id, locale)`.
- `update_translation(article_id, translation_id, ...)` -> `update_translation(article_id, locale, ...)`.
- `delete_translation(...)` -> `move_translation_to_trash(article_id, locale)`.
  Cambio de verbo: la API no tiene DELETE, usa POST `/moveToTrash`.
- `list_attachments(article_id)` -> `list_translation_attachments(article_id, locale)`.
- `delete_attachment(...)` -> `dissociate_attachments(article_id, locale, attachment_ids[])`.
  Cambia verbo y nombre: POST `/dissociateAttachments`, recibe array.
- `like_article(article_id)` -> `like_article(article_id, locale)`.
- `dislike_article(article_id)` -> `dislike_article(article_id, locale)`.

**Renombre por mejor semantica:**
- `list_versions(article_id)` -> `list_article_history(article_id)`.
- `get_version(article_id, version)` -> `get_history_entry(article_id, entry_id)`.
  Path: `/articles/{id}/history`.

### 3.3 Eliminacion de metodos y tools fantasmas

Sin match en la documentacion oficial -> se eliminan del servicio, del registro de tools, y de los schemas:

**articles.ts / tools/articles.ts**
- `getMyArticles` + tool `get_my_articles` (`/myArticles` no existe).
- `moveArticles` + tool `move_articles`.
- `markAsViewed` + tool `mark_as_viewed`.
- `markAsUsed` + tool `mark_as_used`.
- `listRelatedArticles` + tool `list_related_articles`.
- `addRelatedArticles` + tool `add_related_articles`.
- `removeRelatedArticle` + tool `remove_related_article`.
- `listTags` + tool `list_article_tags` (tags aplican solo a tickets en Zoho).
- `updateTags` + tool `update_article_tags`.

**categories.ts / tools/categories.ts** (sub-rutas anidadas inexistentes)
- `listCategories` + tool `list_categories`.
- `getCategory` + tool `get_category`.
- `createCategory` + tool `create_category`.
- `updateCategory` + tool `update_category`.
- `moveCategoryToTrash` + tool `move_category_to_trash`.
- `restoreCategory` + tool `restore_category`.
- `deleteCategory` + tool `delete_category`.
- `listCategoryPermissions` + tool `list_category_permissions`.
- `updateCategoryPermissions` + tool `update_category_permissions`.
- `listAllCategories` + tool `list_all_categories` (`/categories` no existe como resourceURI).

**sections.ts / tools/sections.ts**
- `listSectionsLegacy` + tool `list_sections_legacy` (si existe como tool).
- `getSectionLegacy` + tool `get_section_legacy`.

### 3.4 Fix de paginacion

`src/utils/schemas.ts` — 7 schemas con `from`:
- Cambiar `z.number().default(0)` -> `z.number().min(1).default(1)`.
- Afecta: `listArticlesSchema`, `searchArticlesSchema`, `listTrashedArticlesSchema`, `listRootCategoriesSchema`, `listCategoriesSchema` (si sobrevive la poda), `listSectionsSchema`, `listDepartmentsSchema`.

## 4. Arquitectura

Sin cambios estructurales. Modificaciones locales a archivos existentes:

- **Services** (`src/client/services/`): corregir paths, renombrar metodos donde cambia el contrato, eliminar metodos fantasmas.
- **Tools** (`src/tools/`): actualizar schemas Zod, renombrar tools donde cambia el verbo HTTP, eliminar tools fantasmas.
- **Types** (`src/types/zoho-desk.ts`): sin cambios significativos (las interfaces `ZohoDeskTranslation`/`ZohoDeskAttachment` ya incluyen `locale` como campo).
- **Schemas** (`src/utils/schemas.ts`): fix de paginacion y adaptacion de schemas afectados por cambios de contrato.

No se agregan archivos nuevos. No se eliminan archivos completos.

## 5. Flujo de validacion

Smoke test expandido (`scripts/smoke-test.mjs`) — 8 checks encadenados que descubren datos en runtime en lugar de asumir IDs:

1. `zoho_connection_status` -> CONNECTED.
2. `list_organizations` -> array no vacio.
3. `list_departments` -> array.
4. `list_articles (from=1, limit=1)` -> `{data: [...]}`.
5. `search_articles (search_str="test")` -> `{data: [...]}`. Valida fix `/articles/search`.
6. `list_root_categories (from=1, limit=5)` -> `{data: [...]}`. Valida fix `/kbRootCategories`.
7. `get_category_tree (root_category_id=<primer id de paso 6>)` -> arbol. Valida `/kbRootCategories/{id}/categoryTree`.
8. `list_sections (category_id=<primer id del tree del paso 7>, limit=1)` -> `{data: [...]}`. Valida endpoint plano `/kbSections`.

Cada check que sigue a otro usa datos reales del anterior — elimina fragilidad del smoke actual que probaba IDs ficticios.

## 6. Manejo de errores

Sin cambios en el pipeline del cliente HTTP. Los nuevos endpoints usan los mismos interceptors (refresh automatico en 401/403, rate limit en 429, errorCode en body).

**Nuevo caso**: tools que ahora requieren `locale` obligatorio validan con Zod antes del HTTP — mensaje de error claro devuelto a la IA si falta.

## 7. Testing

**Smoke test expandido** (seccion 5) es la validacion. Sin tests unitarios (misma decision del spec anterior: para un proxy HTTP, mockear axios verifica forma de llamadas pero no que Zoho responda como esperamos).

**Validacion manual** post-implementacion en Claude Desktop:
- `list_root_categories` -> usar un id real para `get_root_category`.
- `list_sections` -> usar un section_id real para `get_section`.
- `list_translations(article_id)` -> usar un locale real para `get_translation`, `update_translation`, `move_translation_to_trash`.
- `like_article(article_id, locale)` y `dislike_article` con locale valido.

Responsabilidad del usuario tras completar el plan de ejecucion.

## 8. Criterios de aceptacion

1. `npm run build` compila sin errores.
2. `npm run smoke` pasa los 8 checks.
3. `grep -rn "/kbCategories" src/` no devuelve resultados.
4. Tools eliminadas no aparecen en el listado del MCP (`ListToolsRequestSchema`).
5. Tools renombradas aparecen con los nombres nuevos: `move_translation_to_trash`, `list_article_history`, `get_history_entry`, `list_translation_attachments`, `dissociate_attachments`.
6. Tools con `locale` obligatorio rechazan llamadas sin locale con error de validacion Zod.
7. `README.md` y `TOOLS_REFERENCE.md` reflejan el catalogo real de tools.
8. No quedan metodos en servicios que no tengan correspondencia con un endpoint documentado.

## 9. Que NO se incluye

- **Nuevos endpoints** de la API de Zoho Desk no presentes en el cliente actual (ej: `/articles/{id}/feedback`, `/articles/{id}/comments`): fuera de alcance. Este spec es fix, no expansion.
- **Endpoints dudosos sin match claro** (permissions anidadas, sections legacy): eliminar sin probar runtime. Si surge necesidad futura, se investiga aparte.
- **Cambios al patron OAuth/secure-storage**: intocable.
- **Tests unitarios**: fuera, por las razones explicadas.
- **Capa de compatibilidad** (mantener firmas viejas con adapter): explicitamente rechazada — MCP en prototipo.

## 10. Riesgos y mitigaciones

1. **Riesgo**: endpoints "dudosos" (legacy, permissions anidadas) puedan estar en uso silencioso.
   **Mitigacion**: MCP confirmado como prototipo. Eliminar es seguro.

2. **Riesgo**: `searchArticles` con `/articles/search` puede requerir parametros query distintos a los del path actual.
   **Mitigacion**: verificar en el HTML de docs antes de implementar (task concreto del plan). Ajustar schema si difiere.

3. **Riesgo**: endpoints planos `/kbSections` pueden no preservar filtrado por `rootCategoryId`.
   **Mitigacion**: la API acepta `categoryId` como filtro — suficiente. `rootCategoryId` no es necesario operacionalmente.

4. **Riesgo**: breaking changes rompan scripts/agentes del usuario que llamen al MCP.
   **Mitigacion**: confirmado solo prototipo. Aceptado.

5. **Riesgo**: al eliminar `move_articles`, `related_articles`, `tags` de articulos, el usuario descubra que SI necesitaba alguna.
   **Mitigacion**: los endpoints no existen en la API actual — mantener las tools solo devolveria 404. Si Zoho reinstaura alguna funcion, se puede re-agregar en un spec futuro.

## 11. Plan de continuidad

Este spec es el cierre del trabajo de alineacion de `mcp_desk_docs`. Tras completarlo:

- El MCP queda funcional end-to-end con su alcance de KB.
- Sirve de **referencia base validada** para los siguientes MCPs de la familia Desk (`mcp_desk_tickets`, `mcp_desk_reports`).
- La auditoria de endpoints (metodo usado aqui) se puede replicar en esos MCPs si heredan codigo legado similar.

## 12. Referencias

- `E:\DinamicAPPS\github\mcp_desk_docs\Zoho Desk API Documentation.html` — fuente de verdad oficial.
- `docs/superpowers/specs/2026-04-17-zoho-desk-mcp-completo-design.md` — spec previo de modernizacion OAuth.
- `docs/superpowers/plans/2026-04-17-modernizar-mcp-desk-docs.md` — plan de implementacion previo.
- Commit `5fdf421` — smoke test que detecto los bugs pre-existentes.

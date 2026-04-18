# Fix Endpoints Zoho Desk API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir ~20 endpoints rotos en `src/client/services/*.ts` detectados en la auditoria contra `Zoho Desk API Documentation.html`, renombrar tools donde el verbo HTTP cambia, y eliminar metodos/tools fantasmas sin respaldo oficial.

**Architecture:** Modificaciones locales a archivos existentes (services, tools, schemas). Sin cambios estructurales. Breaking changes aceptados por usuario (MCP en prototipo). Validacion via smoke test expandido que encadena descubrimiento de datos reales.

**Tech Stack:** TypeScript (ESM), Node 18+, @modelcontextprotocol/sdk, axios, zod. Sin tests unitarios.

---

## Mapa de cambios

**Archivos modificados:**
- `src/client/services/articles.ts` — 4 fixes de path, 4 renombres, 9 metodos eliminados.
- `src/client/services/categories.ts` — 5 fixes de path (kbCategories -> kbRootCategories), 9 metodos eliminados, 1 metodo con nuevo path (getCategoryTree).
- `src/client/services/sections.ts` — migrar a endpoints planos `/kbSections`, 2 metodos legacy eliminados.
- `src/utils/schemas.ts` — fix de paginacion (7 schemas), renombres, 14 schemas eliminados.
- `src/tools/articles.ts` — schemas y llamadas adaptadas, 9 tools eliminadas, 4 renombradas.
- `src/tools/categories.ts` — schemas y llamadas adaptadas, 10 tools eliminadas.
- `src/tools/sections.ts` — schemas y llamadas adaptadas (endpoints planos).
- `src/types/zoho-desk.ts` — ajustes de interfaces afectadas.
- `scripts/smoke-test.mjs` — expandido a 8 checks encadenados.
- `README.md` y `TOOLS_REFERENCE.md` — catalogo actualizado.

**Archivos NO tocados:** `src/utils/config.ts`, `src/utils/secure-storage.ts`, `src/utils/oauth-helpers.ts`, `src/tools/oauth.ts`, `src/tools/meta.ts`, `src/tools/_helpers.ts`, `src/client/zoho-client.ts`, `src/client/services/organizations.ts`, `src/client/services/departments.ts`, `src/index.ts`.

---

## Task 1: Fix paths de root categories en categories.ts

**Files:**
- Modify: `src/client/services/categories.ts`

**Por que:** Todos los metodos de root categories usan `/kbCategories` (no existe) en lugar de `/kbRootCategories` (documentado).

- [ ] **Step 1: Reemplazar endpoint en listRootCategories**

En `src/client/services/categories.ts`, linea 30:

```typescript
    const response = await this._client.getList<ZohoDeskFolder>('/kbCategories', queryParams);
```

Cambiar a:

```typescript
    const response = await this._client.getList<ZohoDeskFolder>('/kbRootCategories', queryParams);
```

Y actualizar el comentario en linea 21:

```typescript
   * GET /api/v1/kbRootCategories
```

- [ ] **Step 2: Reemplazar endpoint en getRootCategory**

Linea 39:

```typescript
    return this._client.get<ZohoDeskFolder>(`/kbCategories/${categoryId}`);
```

a:

```typescript
    return this._client.get<ZohoDeskFolder>(`/kbRootCategories/${categoryId}`);
```

Y comentario en linea 36.

- [ ] **Step 3: Reemplazar endpoint en createRootCategory**

Linea 56:

```typescript
    return this._client.post<ZohoDeskFolder>('/kbCategories', payload);
```

a:

```typescript
    return this._client.post<ZohoDeskFolder>('/kbRootCategories', payload);
```

Y comentario en linea 44.

- [ ] **Step 4: Reemplazar endpoint en updateRootCategory**

Linea 71:

```typescript
    return this._client.patch<ZohoDeskFolder>(`/kbCategories/${categoryId}`, payload);
```

a:

```typescript
    return this._client.patch<ZohoDeskFolder>(`/kbRootCategories/${categoryId}`, payload);
```

Y comentario en linea 61.

- [ ] **Step 5: Reemplazar endpoint en moveRootCategoryToTrash**

Linea 79:

```typescript
    await this._client.post(`/kbCategories/${categoryId}/moveToTrash`);
```

a:

```typescript
    await this._client.post(`/kbRootCategories/${categoryId}/moveToTrash`);
```

Y comentario en linea 76.

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/client/services/categories.ts
git commit -m "fix(categories): /kbCategories -> /kbRootCategories (root endpoints)

Los 5 metodos de root categories usaban /kbCategories que devuelve 404.
El path correcto segun Zoho Desk API Documentation es /kbRootCategories.

Metodos afectados: listRootCategories, getRootCategory, createRootCategory,
updateRootCategory, moveRootCategoryToTrash."
```

---

## Task 2: Eliminar metodos fantasmas y legacy de categories.ts

**Files:**
- Modify: `src/client/services/categories.ts`

**Por que:** Sub-categorias anidadas (`/kbCategories/{rootId}/categories/...`), `/categories` legacy, permissions anidadas — todos sin match en docs.

- [ ] **Step 1: Eliminar bloque "CHILD CATEGORIES"**

En `src/client/services/categories.ts`, eliminar desde la linea 82 (comentario `// CHILD CATEGORIES...`) hasta la linea 162 (cierre de `deleteCategory`). Eso incluye: `listCategories`, `getCategory`, `createCategory`, `updateCategory`, `moveCategoryToTrash`, `restoreCategory`, `deleteCategory`.

- [ ] **Step 2: Eliminar bloque "LEGACY ENDPOINTS" (solo listAllCategories)**

En el bloque legacy, eliminar el metodo `listAllCategories` (lineas 168-181 aprox). **Conservar** `getCategoryTree` pero hay que corregirlo en la siguiente task — por ahora dejalo como esta.

- [ ] **Step 3: Eliminar bloque "PERMISOS DE CATEGORIA"**

Eliminar completo el bloque `// PERMISOS DE CATEGORIA` con `listCategoryPermissions` y `updateCategoryPermissions`.

- [ ] **Step 4: Eliminar bloque "CATEGORIAS EN PAPELERA"**

Eliminar `listTrashedCategories` (depende de `listCategories` que ya no existe).

- [ ] **Step 5: Limpiar imports no usados**

Al principio del archivo, el import de tipos ahora trae varios que ya no se usan. Revisar la linea 2-10:

```typescript
import type {
  ZohoDeskCategory,
  CreateCategoryDTO,
  UpdateCategoryDTO,
  CategorySearchParams,
  ZohoDeskCategoryTree,
  CategoryPermission,
  ZohoDeskFolder,
} from '../../types/index.js';
```

Tras la eliminacion, los tipos aun en uso son: `CreateCategoryDTO`, `UpdateCategoryDTO` (usados por root category), `CategorySearchParams` (usado por `listRootCategories`), `ZohoDeskCategoryTree` (usado por `getCategoryTree`), `ZohoDeskFolder` (usado por root). Los que se eliminan: `ZohoDeskCategory`, `CategoryPermission`.

Cambiar a:

```typescript
import type {
  CreateCategoryDTO,
  UpdateCategoryDTO,
  CategorySearchParams,
  ZohoDeskCategoryTree,
  ZohoDeskFolder,
} from '../../types/index.js';
```

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: el build puede fallar en `src/tools/categories.ts` porque referencia a `api.categories.listCategories`, `getCategory`, etc. que ya no existen. Esos errores son esperados y se resuelven en Task 8 (cuando limpiemos tools/categories.ts). **Si aparecen solo esos errores** procede con el commit. Si hay otros errores (en services, schemas, etc.) pausa y reporta.

- [ ] **Step 7: Commit**

```bash
git add src/client/services/categories.ts
git commit -m "chore(categories): eliminar metodos sin respaldo en API oficial

Eliminados:
- Sub-categorias anidadas: listCategories, getCategory, createCategory,
  updateCategory, moveCategoryToTrash, restoreCategory, deleteCategory,
  listTrashedCategories (path /kbCategories/{rootId}/categories no existe)
- Permissions anidadas: listCategoryPermissions, updateCategoryPermissions
- Legacy: listAllCategories (/categories no existe como resourceURI)

El build de tools/categories.ts fallara hasta Task 8 donde se limpian
las tools huerfanas que referencian estos metodos."
```

---

## Task 3: Corregir getCategoryTree en categories.ts

**Files:**
- Modify: `src/client/services/categories.ts`

**Por que:** `GET /categories/{id}/tree` no existe. El correcto es `GET /kbRootCategories/{rootCategoryId}/categoryTree`.

- [ ] **Step 1: Cambiar la firma y el path**

Localizar el metodo `getCategoryTree`:

```typescript
  /**
   * Obtiene el árbol de una categoría (con secciones y subcategorías)
   * GET /api/v1/categories/{categoryId}/tree
   */
  async getCategoryTree(categoryId: string): Promise<ZohoDeskCategoryTree> {
    return this._client.get<ZohoDeskCategoryTree>(`/categories/${categoryId}/tree`);
  }
```

Reemplazar por:

```typescript
  /**
   * Obtiene el arbol de una categoria raiz (con secciones y subcategorias)
   * GET /api/v1/kbRootCategories/{rootCategoryId}/categoryTree
   */
  async getCategoryTree(rootCategoryId: string): Promise<ZohoDeskCategoryTree> {
    return this._client.get<ZohoDeskCategoryTree>(`/kbRootCategories/${rootCategoryId}/categoryTree`);
  }
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: igual que Task 2 — errores solo en `tools/categories.ts` (resueltos en Task 8).

- [ ] **Step 3: Commit**

```bash
git add src/client/services/categories.ts
git commit -m "fix(categories): getCategoryTree usa /kbRootCategories/{id}/categoryTree

GET /categories/{id}/tree no existe en la API. El endpoint correcto es
GET /kbRootCategories/{rootCategoryId}/categoryTree segun docs oficiales.

Cambio de contrato: el parametro ahora es rootCategoryId (no categoryId)
porque el arbol se obtiene a partir de una categoria raiz."
```

---

## Task 4: Migrar sections.ts a endpoints planos /kbSections

**Files:**
- Modify: `src/client/services/sections.ts`

**Por que:** Las rutas anidadas `/kbCategories/{rootId}/categories/{id}/sections/...` no existen. La API usa endpoints planos `/kbSections` con `categoryId` como query/body.

- [ ] **Step 1: Reescribir el archivo completo**

Reemplazar el contenido completo de `src/client/services/sections.ts` con:

```typescript
import type { ZohoDeskClient } from '../zoho-client.js';
import type {
  ZohoDeskSection,
  CreateSectionDTO,
  UpdateSectionDTO,
  SectionSearchParams,
} from '../../types/index.js';

export class SectionsService {
  constructor(private _client: ZohoDeskClient) {}

  /**
   * Lista secciones filtrando por category.
   * GET /api/v1/kbSections?categoryId={categoryId}
   */
  async listSections(
    categoryId: string,
    params: SectionSearchParams = {}
  ): Promise<ZohoDeskSection[]> {
    const queryParams: Record<string, any> = { categoryId };

    if (params.from !== undefined) queryParams.from = params.from;
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.isTrashed !== undefined) queryParams.isTrashed = params.isTrashed;

    const response = await this._client.getList<ZohoDeskSection>('/kbSections', queryParams);
    return response.data || [];
  }

  /**
   * Obtiene una seccion por su ID.
   * GET /api/v1/kbSections/{sectionId}
   */
  async getSection(sectionId: string): Promise<ZohoDeskSection> {
    return this._client.get<ZohoDeskSection>(`/kbSections/${sectionId}`);
  }

  /**
   * Crea una nueva seccion.
   * POST /api/v1/kbSections
   * Body: {categoryId, name, ...}
   */
  async createSection(categoryId: string, data: CreateSectionDTO): Promise<ZohoDeskSection> {
    const payload: Record<string, any> = {
      categoryId,
      name: data.name,
    };

    if (data.description) payload.description = data.description;
    if (data.displayOrder !== undefined) payload.displayOrder = data.displayOrder;
    if (data.visibility) payload.visibility = data.visibility;

    return this._client.post<ZohoDeskSection>('/kbSections', payload);
  }

  /**
   * Actualiza una seccion existente.
   * PATCH /api/v1/kbSections/{sectionId}
   */
  async updateSection(sectionId: string, data: UpdateSectionDTO): Promise<ZohoDeskSection> {
    const payload: Record<string, any> = {};

    if (data.name) payload.name = data.name;
    if (data.description) payload.description = data.description;
    if (data.displayOrder !== undefined) payload.displayOrder = data.displayOrder;
    if (data.visibility) payload.visibility = data.visibility;

    return this._client.patch<ZohoDeskSection>(`/kbSections/${sectionId}`, payload);
  }

  /**
   * Mueve una seccion a la papelera.
   * POST /api/v1/kbSections/{sectionId}/moveToTrash
   */
  async moveSectionToTrash(sectionId: string): Promise<void> {
    await this._client.post(`/kbSections/${sectionId}/moveToTrash`);
  }
}
```

Nota: se eliminan `restoreSection`, `deleteSection`, `listTrashedSections`, `listSectionsLegacy`, `getSectionLegacy`. Si la API tiene equivalentes en el modelo plano, se agregan en un spec futuro tras verificar en docs.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: errores en `tools/sections.ts` que referencian metodos eliminados (`restoreSection`, `deleteSection`, etc.) y tambien porque la firma de `listSections`/`getSection`/`createSection`/`updateSection`/`moveSectionToTrash` cambio. **Todos esos errores se resuelven en Task 9**.

- [ ] **Step 3: Commit**

```bash
git add src/client/services/sections.ts
git commit -m "refactor(sections): migrar a endpoints planos /kbSections

Los paths anidados /kbCategories/{rootId}/categories/{id}/sections/...
no existen en la API. Los endpoints reales son planos /kbSections y
/kbSections/{sectionId}, con categoryId pasado en query (list) o body
(create).

Cambios de firma:
- listSections(categoryId, params)
- getSection(sectionId)
- createSection(categoryId, data)
- updateSection(sectionId, data)
- moveSectionToTrash(sectionId)

Eliminados: restoreSection, deleteSection, listTrashedSections,
listSectionsLegacy, getSectionLegacy (sin match en docs oficiales).

El build de tools/sections.ts fallara hasta Task 9."
```

---

## Task 5: Fix paths y eliminar metodos fantasmas de articles.ts (parte 1: CRUD base)

**Files:**
- Modify: `src/client/services/articles.ts`

**Por que:** Corregir searchArticles, checkPermalink, restoreFromTrash, deleteArticles. Eliminar moveArticles y getMyArticles.

- [ ] **Step 1: Fix searchArticles**

Linea 65:

```typescript
    const response = await this._client.getList<ZohoDeskArticle>('/kbArticles/search', queryParams);
```

Cambiar a:

```typescript
    const response = await this._client.getList<ZohoDeskArticle>('/articles/search', queryParams);
```

Y comentario en linea 52:

```typescript
   * GET /api/v1/articles/search
```

- [ ] **Step 2: Fix checkPermalink (cambia verbo GET -> POST y path)**

Reemplazar el metodo completo:

```typescript
  /**
   * Verifica disponibilidad de permalink
   * GET /api/v1/articles/permaLink
   */
  async checkPermalink(permalink: string, articleId?: string): Promise<PermalinkCheckResponse> {
    const params: Record<string, any> = { permalink };
    if (articleId) params.articleId = articleId;

    return this._client.get<PermalinkCheckResponse>('/articles/permaLink', params);
  }
```

por:

```typescript
  /**
   * Verifica disponibilidad de permalink.
   * POST /api/v1/articles/checkPermalinkAvailability
   */
  async checkPermalink(permalink: string, articleId?: string): Promise<PermalinkCheckResponse> {
    const payload: Record<string, any> = { permalink };
    if (articleId) payload.articleId = articleId;

    return this._client.post<PermalinkCheckResponse>('/articles/checkPermalinkAvailability', payload);
  }
```

- [ ] **Step 3: Fix restoreFromTrash (ahora usa /recycleBin/restore)**

Reemplazar el metodo `restoreFromTrash`:

```typescript
  /**
   * Restaura artículos de la papelera
   * POST /api/v1/articles/restore
   */
  async restoreFromTrash(articleIds: string[]): Promise<void> {
    await this._client.post('/articles/restore', { articleIds });
  }
```

por:

```typescript
  /**
   * Restaura articulos de la papelera.
   * POST /api/v1/recycleBin/restore
   * Body: {ids: [...]}
   */
  async restoreFromTrash(articleIds: string[]): Promise<void> {
    await this._client.post('/recycleBin/restore', { ids: articleIds });
  }
```

- [ ] **Step 4: Fix deleteArticles (ahora usa /recycleBin/delete)**

Reemplazar el metodo `deleteArticles`:

```typescript
  /**
   * Elimina artículos permanentemente (solo si están en papelera)
   * DELETE /api/v1/articles
   */
  async deleteArticles(articleIds: string[]): Promise<void> {
    await this._client.post('/articles/delete', { articleIds });
  }
```

por:

```typescript
  /**
   * Elimina articulos permanentemente (solo si estan en papelera).
   * POST /api/v1/recycleBin/delete
   * Body: {ids: [...]}
   */
  async deleteArticles(articleIds: string[]): Promise<void> {
    await this._client.post('/recycleBin/delete', { ids: articleIds });
  }
```

- [ ] **Step 5: Eliminar moveArticles (path sin match)**

Eliminar el metodo completo:

```typescript
  /**
   * Mueve artículos a otra categoría/sección
   * POST /api/v1/articles/move
   */
  async moveArticles(articleIds: string[], categoryId: string, sectionId?: string): Promise<void> {
    const payload: Record<string, any> = {
      articleIds,
      categoryId,
    };
    if (sectionId) payload.sectionId = sectionId;

    await this._client.post('/articles/move', payload);
  }
```

- [ ] **Step 6: Eliminar getMyArticles (path sin match)**

Eliminar el metodo completo:

```typescript
  /**
   * Obtiene mis artículos (drafts, approvals, published)
   * GET /api/v1/myArticles
   */
  async getMyArticles(): Promise<MyArticlesResponse> {
    return this._client.get<MyArticlesResponse>('/myArticles');
  }
```

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: errores solo en `tools/articles.ts` (referencia `api.articles.moveArticles`, `getMyArticles`). Se resuelven en Task 7.

- [ ] **Step 8: Commit**

```bash
git add src/client/services/articles.ts
git commit -m "fix(articles): corregir 4 endpoints y eliminar 2 fantasmas (CRUD base)

Fixes:
- searchArticles: /kbArticles/search -> /articles/search
- checkPermalink: GET /articles/permaLink -> POST /articles/checkPermalinkAvailability
- restoreFromTrash: /articles/restore -> /recycleBin/restore (body: {ids})
- deleteArticles: /articles/delete -> /recycleBin/delete (body: {ids})

Eliminados (sin match en docs):
- moveArticles (/articles/move no existe)
- getMyArticles (/myArticles no existe)

Los errores de build en tools/articles.ts se resuelven en tareas posteriores."
```

---

## Task 6: Renombrar versiones a history y adaptar modelo de traducciones a locale

**Files:**
- Modify: `src/client/services/articles.ts`

**Por que:** `/articles/{id}/versions` no existe — el endpoint correcto es `/articles/{id}/history`. Las traducciones se identifican por `locale`, no `translationId`.

- [ ] **Step 1: Renombrar listVersions a listArticleHistory**

Reemplazar:

```typescript
  /**
   * Lista versiones de un artículo
   * GET /api/v1/articles/{articleId}/versions
   */
  async listVersions(articleId: string): Promise<ZohoDeskArticleVersion[]> {
    const response = await this._client.getList<ZohoDeskArticleVersion>(`/articles/${articleId}/versions`);
    return response.data || [];
  }
```

por:

```typescript
  /**
   * Lista entradas del historial de un articulo.
   * GET /api/v1/articles/{articleId}/history
   */
  async listArticleHistory(articleId: string): Promise<ZohoDeskArticleVersion[]> {
    const response = await this._client.getList<ZohoDeskArticleVersion>(`/articles/${articleId}/history`);
    return response.data || [];
  }
```

- [ ] **Step 2: Renombrar getVersion a getHistoryEntry**

Reemplazar:

```typescript
  /**
   * Obtiene una versión específica de un artículo
   * GET /api/v1/articles/{articleId}/versions/{version}
   */
  async getVersion(articleId: string, version: number): Promise<ZohoDeskArticleVersion> {
    return this._client.get<ZohoDeskArticleVersion>(`/articles/${articleId}/versions/${version}`);
  }
```

por:

```typescript
  /**
   * Obtiene una entrada especifica del historial.
   * GET /api/v1/articles/{articleId}/history/{entryId}
   */
  async getHistoryEntry(articleId: string, entryId: string): Promise<ZohoDeskArticleVersion> {
    return this._client.get<ZohoDeskArticleVersion>(`/articles/${articleId}/history/${entryId}`);
  }
```

- [ ] **Step 3: Adaptar getTranslation a locale**

Reemplazar:

```typescript
  /**
   * Obtiene una traducción específica
   * GET /api/v1/articles/{articleId}/translations/{translationId}
   */
  async getTranslation(articleId: string, translationId: string): Promise<ZohoDeskTranslation> {
    return this._client.get<ZohoDeskTranslation>(`/articles/${articleId}/translations/${translationId}`);
  }
```

por:

```typescript
  /**
   * Obtiene una traduccion por su locale.
   * GET /api/v1/articles/{articleId}/translations/{locale}
   */
  async getTranslation(articleId: string, locale: string): Promise<ZohoDeskTranslation> {
    return this._client.get<ZohoDeskTranslation>(`/articles/${articleId}/translations/${locale}`);
  }
```

- [ ] **Step 4: Adaptar updateTranslation a locale**

Reemplazar:

```typescript
  /**
   * Actualiza una traducción
   * PATCH /api/v1/articles/{articleId}/translations/{translationId}
   */
  async updateTranslation(articleId: string, translationId: string, data: UpdateTranslationDTO): Promise<ZohoDeskTranslation> {
    const payload: Record<string, any> = {};

    if (data.title) payload.title = data.title;
    if (data.answer) payload.answer = data.answer;
    if (data.status) payload.status = data.status;

    return this._client.patch<ZohoDeskTranslation>(`/articles/${articleId}/translations/${translationId}`, payload);
  }
```

por:

```typescript
  /**
   * Actualiza una traduccion identificada por locale.
   * PATCH /api/v1/articles/{articleId}/translations/{locale}
   */
  async updateTranslation(articleId: string, locale: string, data: UpdateTranslationDTO): Promise<ZohoDeskTranslation> {
    const payload: Record<string, any> = {};

    if (data.title) payload.title = data.title;
    if (data.answer) payload.answer = data.answer;
    if (data.status) payload.status = data.status;

    return this._client.patch<ZohoDeskTranslation>(`/articles/${articleId}/translations/${locale}`, payload);
  }
```

- [ ] **Step 5: Reemplazar deleteTranslation por moveTranslationToTrash**

Reemplazar:

```typescript
  /**
   * Elimina una traducción
   * DELETE /api/v1/articles/{articleId}/translations/{translationId}
   */
  async deleteTranslation(articleId: string, translationId: string): Promise<void> {
    await this._client.delete(`/articles/${articleId}/translations/${translationId}`);
  }
```

por:

```typescript
  /**
   * Mueve una traduccion a la papelera.
   * POST /api/v1/articles/{articleId}/translations/{locale}/moveToTrash
   */
  async moveTranslationToTrash(articleId: string, locale: string): Promise<void> {
    await this._client.post(`/articles/${articleId}/translations/${locale}/moveToTrash`);
  }
```

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: errores solo en `tools/articles.ts` (se resuelven en Task 7).

- [ ] **Step 7: Commit**

```bash
git add src/client/services/articles.ts
git commit -m "refactor(articles): versions -> history, translations por locale

Endpoints real segun docs:
- /articles/{id}/history (no /versions)
- /articles/{id}/translations/{locale} (no /translations/{id})
- POST /moveToTrash (no DELETE)

Renombres:
- listVersions -> listArticleHistory
- getVersion(articleId, version:number) -> getHistoryEntry(articleId, entryId:string)
- deleteTranslation -> moveTranslationToTrash

Breaking: getTranslation, updateTranslation reciben locale en lugar de
translationId (parametro numerico antiguo no existe en la API real)."
```

---

## Task 7: Adaptar attachments y like/dislike a modelo por-traduccion

**Files:**
- Modify: `src/client/services/articles.ts`

**Por que:** Attachments y like/dislike viven bajo `/articles/{id}/translations/{locale}/...`, no en la raiz del articulo.

- [ ] **Step 1: Reemplazar listAttachments por listTranslationAttachments**

Reemplazar:

```typescript
  /**
   * Lista los adjuntos de un artículo
   * GET /api/v1/articles/{articleId}/attachments
   */
  async listAttachments(articleId: string): Promise<ZohoDeskAttachment[]> {
    const response = await this._client.getList<ZohoDeskAttachment>(`/articles/${articleId}/attachments`);
    return response.data || [];
  }
```

por:

```typescript
  /**
   * Lista los adjuntos de una traduccion de articulo.
   * GET /api/v1/articles/{articleId}/translations/{locale}/attachments
   */
  async listTranslationAttachments(articleId: string, locale: string): Promise<ZohoDeskAttachment[]> {
    const response = await this._client.getList<ZohoDeskAttachment>(
      `/articles/${articleId}/translations/${locale}/attachments`
    );
    return response.data || [];
  }
```

- [ ] **Step 2: Reemplazar deleteAttachment por dissociateAttachments (masivo)**

Reemplazar:

```typescript
  /**
   * Elimina un adjunto
   * DELETE /api/v1/articles/{articleId}/attachments/{attachmentId}
   */
  async deleteAttachment(articleId: string, attachmentId: string): Promise<void> {
    await this._client.delete(`/articles/${articleId}/attachments/${attachmentId}`);
  }
```

por:

```typescript
  /**
   * Desasocia (quita) uno o mas adjuntos de una traduccion de articulo.
   * POST /api/v1/articles/{articleId}/translations/{locale}/dissociateAttachments
   * Body: {attachmentIds: [...]}
   */
  async dissociateAttachments(articleId: string, locale: string, attachmentIds: string[]): Promise<void> {
    await this._client.post(
      `/articles/${articleId}/translations/${locale}/dissociateAttachments`,
      { attachmentIds }
    );
  }
```

- [ ] **Step 3: Adaptar likeArticle a locale**

Reemplazar:

```typescript
  /**
   * Registra like en un artículo
   * POST /api/v1/articles/{articleId}/like
   */
  async likeArticle(articleId: string): Promise<void> {
    await this._client.post(`/articles/${articleId}/like`);
  }
```

por:

```typescript
  /**
   * Registra like en una traduccion de articulo.
   * POST /api/v1/articles/{articleId}/translations/{locale}/like
   */
  async likeArticle(articleId: string, locale: string): Promise<void> {
    await this._client.post(`/articles/${articleId}/translations/${locale}/like`);
  }
```

- [ ] **Step 4: Adaptar dislikeArticle a locale**

Reemplazar:

```typescript
  /**
   * Registra dislike en un artículo
   * POST /api/v1/articles/{articleId}/dislike
   */
  async dislikeArticle(articleId: string): Promise<void> {
    await this._client.post(`/articles/${articleId}/dislike`);
  }
```

por:

```typescript
  /**
   * Registra dislike en una traduccion de articulo.
   * POST /api/v1/articles/{articleId}/translations/{locale}/dislike
   */
  async dislikeArticle(articleId: string, locale: string): Promise<void> {
    await this._client.post(`/articles/${articleId}/translations/${locale}/dislike`);
  }
```

- [ ] **Step 5: Eliminar listRelatedArticles, addRelatedArticles, removeRelatedArticle, listTags, updateTags, markAsViewed, markAsUsed**

Eliminar los bloques completos (desde el comentario `// ARTICULOS RELACIONADOS` hasta el final del archivo), que son:

- `listRelatedArticles`
- `addRelatedArticles`
- `removeRelatedArticle`
- `listTags`
- `updateTags`
- `markAsViewed`
- `markAsUsed`

Dejar intacto el cierre `}` de la clase `ArticlesService`.

- [ ] **Step 6: Limpiar imports no usados**

Revisar los imports de tipos al principio del archivo. Tras las eliminaciones, ya no se usan: `RelatedArticle`, `MyArticlesResponse`.

Cambiar:

```typescript
import type {
  ZohoDeskArticle,
  CreateArticleDTO,
  UpdateArticleDTO,
  ArticleSearchParams,
  ZohoDeskTranslation,
  CreateTranslationDTO,
  UpdateTranslationDTO,
  ZohoDeskAttachment,
  ZohoDeskArticleVersion,
  RelatedArticle,
  PermalinkCheckResponse,
  MyArticlesResponse,
} from '../../types/index.js';
```

a:

```typescript
import type {
  ZohoDeskArticle,
  CreateArticleDTO,
  UpdateArticleDTO,
  ArticleSearchParams,
  ZohoDeskTranslation,
  CreateTranslationDTO,
  UpdateTranslationDTO,
  ZohoDeskAttachment,
  ZohoDeskArticleVersion,
  PermalinkCheckResponse,
} from '../../types/index.js';
```

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: errores solo en `tools/articles.ts` (se resuelven en la siguiente task).

- [ ] **Step 8: Commit**

```bash
git add src/client/services/articles.ts
git commit -m "refactor(articles): attachments/like/dislike por-traduccion + purga fantasmas

Attachments, like y dislike viven bajo /articles/{id}/translations/{locale}/...
en la API real, no en la raiz del articulo.

Cambios:
- listAttachments(id) -> listTranslationAttachments(id, locale)
- deleteAttachment(id, attId) -> dissociateAttachments(id, locale, ids[])
  (POST masivo, no DELETE individual)
- likeArticle(id) -> likeArticle(id, locale)
- dislikeArticle(id) -> dislikeArticle(id, locale)

Eliminados (sin respaldo en docs):
- listRelatedArticles, addRelatedArticles, removeRelatedArticle
  (/articles/{id}/relatedArticles no existe)
- listTags, updateTags (tags aplican solo a tickets en Zoho)
- markAsViewed, markAsUsed (endpoints no existen)

Cierre limpio de services/articles.ts. Build en tools/articles.ts se
repara en la siguiente tarea."
```

---

## Task 8: Actualizar schemas.ts

**Files:**
- Modify: `src/utils/schemas.ts`

**Por que:** Los schemas definen los parametros que recibe cada tool. Deben reflejar los cambios de contrato: `locale` en lugar de `translation_id`, `from: min(1)`, eliminacion de schemas para tools eliminadas, renombres.

- [ ] **Step 1: Fix paginacion en los 7 schemas con `from`**

Para cada uno de estos schemas, cambiar `from: z.number().default(0)` por `from: z.number().min(1).default(1)`:

1. `listArticlesSchema` (linea 22)
2. `searchArticlesSchema` (linea 43)
3. `listTrashedArticlesSchema` (linea 130)
4. `listRootCategoriesSchema` (linea 246)
5. `listCategoriesSchema` (si sobrevive — este schema debe ELIMINARSE, ver step 6)
6. `listSectionsSchema` (linea 345 — su forma cambia completa, ver step 7)
7. `listDepartmentsSchema` (linea 395)

**Para schemas que NO se eliminan**, buscar la linea exacta `from: z.number().default(0).describe('Starting index for pagination'),` y reemplazar por:

```typescript
    from: z.number().min(1).default(1).describe('Starting index for pagination (min: 1)'),
```

Hacer esto en: `listArticlesSchema`, `searchArticlesSchema`, `listTrashedArticlesSchema`, `listRootCategoriesSchema`, `listDepartmentsSchema`.

- [ ] **Step 2: Renombrar schemas de versions a history**

Reemplazar:

```typescript
export const listVersionsSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
  })
);

export const getVersionSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
    version: z.number().describe('Version number'),
  })
);
```

por:

```typescript
export const listArticleHistorySchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
  })
);

export const getHistoryEntrySchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
    entry_id: z.string().describe('History entry ID'),
  })
);
```

- [ ] **Step 3: Adaptar schemas de translations a locale**

Reemplazar el bloque de schemas de translations. Los actuales son `getTranslationSchema`, `createTranslationSchema`, `updateTranslationSchema`, `deleteTranslationSchema`. Los nuevos:

```typescript
export const listTranslationsSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
  })
);

export const getTranslationSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
    locale: z.string().describe('Locale code (e.g. "en", "en-us", "es")'),
  })
);

export const createTranslationSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
    locale: z.string().describe('Locale code'),
    title: z.string().describe('Translation title'),
    answer: z.string().describe('Translation content (HTML supported)'),
    status: z.enum(['Draft', 'In Review', 'Approved', 'Published']).optional().describe('Translation status'),
  })
);

export const updateTranslationSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
    locale: z.string().describe('Locale code'),
    title: z.string().optional().describe('Translation title'),
    answer: z.string().optional().describe('Translation content'),
    status: z.enum(['Draft', 'In Review', 'Approved', 'Published']).optional(),
  })
);

export const moveTranslationToTrashSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
    locale: z.string().describe('Locale code'),
  })
);
```

- [ ] **Step 4: Adaptar schemas de attachments a por-traduccion**

Reemplazar `listAttachmentsSchema` y `deleteAttachmentSchema` por:

```typescript
export const listTranslationAttachmentsSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
    locale: z.string().describe('Locale code (e.g. "en")'),
  })
);

export const dissociateAttachmentsSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
    locale: z.string().describe('Locale code'),
    attachment_ids: z.array(z.string()).min(1).describe('Array of attachment IDs to dissociate'),
  })
);
```

- [ ] **Step 5: Adaptar schema de feedback (like/dislike) a locale**

Reemplazar `articleFeedbackSchema`:

```typescript
export const articleFeedbackSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
  })
);
```

por:

```typescript
export const articleFeedbackSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
    locale: z.string().describe('Locale code of the translation to like/dislike'),
  })
);
```

- [ ] **Step 6: Eliminar schemas de tools/metodos fantasmas**

Eliminar completamente los siguientes schemas del archivo:

- `moveArticlesSchema` (linea ~113)
- `listRelatedArticlesSchema`, `addRelatedArticlesSchema`, `removeRelatedArticleSchema`
- `listCategoriesSchema`, `getCategorySchema`, `createCategorySchema`, `updateCategorySchema`, `deleteCategorySchema`
- `getCategoryTreeSchema` — NO eliminar, pero cambia su forma. Ver Step 8.

- [ ] **Step 7: Reemplazar listSectionsSchema, getSectionSchema, createSectionSchema, updateSectionSchema, deleteSectionSchema**

El bloque actual de section schemas asume jerarquia anidada. Reemplazar por:

```typescript
export const listSectionsSchema = baseSchema.merge(
  z.object({
    category_id: z.string().describe('Category ID to list sections for'),
    from: z.number().min(1).default(1).describe('Starting index for pagination (min: 1)'),
    limit: z.number().default(50).describe('Number of sections to retrieve'),
    is_trashed: z.boolean().optional().describe('Filter by trashed state'),
  })
);

export const getSectionSchema = baseSchema.merge(
  z.object({
    section_id: z.string().describe('Section ID'),
  })
);

export const createSectionSchema = baseSchema.merge(
  z.object({
    category_id: z.string().describe('Parent category ID'),
    name: z.string().describe('Section name'),
    description: z.string().optional().describe('Section description'),
    display_order: z.number().optional().describe('Display order'),
    visibility: z.enum(['Agents', 'All', 'Logged in Users', 'Custom access']).optional(),
  })
);

export const updateSectionSchema = baseSchema.merge(
  z.object({
    section_id: z.string().describe('Section ID'),
    name: z.string().optional(),
    description: z.string().optional(),
    display_order: z.number().optional(),
    visibility: z.enum(['Agents', 'All', 'Logged in Users', 'Custom access']).optional(),
  })
);

export const moveSectionToTrashSchema = baseSchema.merge(
  z.object({
    section_id: z.string().describe('Section ID'),
  })
);
```

Eliminar `deleteSectionSchema` (el metodo ya no existe).

- [ ] **Step 8: Ajustar getCategoryTreeSchema (recibe root_category_id)**

Reemplazar:

```typescript
export const getCategoryTreeSchema = baseSchema.merge(
  z.object({
    category_id: z.string().describe('Category ID'),
  })
);
```

por:

```typescript
export const getCategoryTreeSchema = baseSchema.merge(
  z.object({
    root_category_id: z.string().describe('Root category ID to retrieve the tree for'),
  })
);
```

- [ ] **Step 9: Build**

Run: `npm run build`
Expected: fallos en tools/*.ts por schemas renombrados o eliminados. Todos se resuelven en Tasks 9, 10, 11.

- [ ] **Step 10: Commit**

```bash
git add src/utils/schemas.ts
git commit -m "refactor(schemas): fix paginacion + adaptar a endpoints reales

Cambios:
- from: default(0) -> min(1).default(1) en 5 schemas paginados
- translations: translation_id -> locale
- versions -> history (listArticleHistorySchema, getHistoryEntrySchema)
- attachments -> por-traduccion (listTranslationAttachments,
  dissociateAttachments)
- articleFeedback: agrega locale obligatorio
- sections: jerarquia anidada -> endpoints planos
  (listSections usa category_id, resto usa section_id)
- getCategoryTree: category_id -> root_category_id

Eliminados (tools fantasmas):
- moveArticlesSchema, listRelatedArticlesSchema, addRelatedArticlesSchema,
  removeRelatedArticleSchema, listCategoriesSchema, getCategorySchema,
  createCategorySchema, updateCategorySchema, deleteCategorySchema,
  deleteSectionSchema

Build de tools/*.ts fallara hasta tasks 9-11."
```

---

## Task 9: Adaptar tools/articles.ts

**Files:**
- Modify: `src/tools/articles.ts`

**Por que:** Sincronizar con los cambios de servicio (nombres, firmas) y schemas. Eliminar tools fantasmas.

- [ ] **Step 1: Actualizar imports de schemas**

Al principio de `src/tools/articles.ts`, eliminar los imports de schemas que ya no existen y agregar los nuevos. El import actual:

```typescript
import {
  listArticlesSchema,
  getArticleSchema,
  searchArticlesSchema,
  createArticleSchema,
  updateArticleSchema,
  moveToTrashSchema,
  restoreFromTrashSchema,
  deleteArticlesSchema,
  moveArticlesSchema,
  checkPermalinkSchema,
  listTrashedArticlesSchema,
  listVersionsSchema,
  getVersionSchema,
  listTranslationsSchema,
  createTranslationSchema,
  updateTranslationSchema,
  deleteTranslationSchema,
  listAttachmentsSchema,
  deleteAttachmentSchema,
  listRelatedArticlesSchema,
  addRelatedArticlesSchema,
  removeRelatedArticleSchema,
  articleFeedbackSchema,
  baseSchema,
} from '../utils/schemas.js';
```

Reemplazar por:

```typescript
import {
  listArticlesSchema,
  getArticleSchema,
  searchArticlesSchema,
  createArticleSchema,
  updateArticleSchema,
  moveToTrashSchema,
  restoreFromTrashSchema,
  deleteArticlesSchema,
  checkPermalinkSchema,
  listTrashedArticlesSchema,
  listArticleHistorySchema,
  getHistoryEntrySchema,
  listTranslationsSchema,
  createTranslationSchema,
  updateTranslationSchema,
  getTranslationSchema,
  moveTranslationToTrashSchema,
  listTranslationAttachmentsSchema,
  dissociateAttachmentsSchema,
  articleFeedbackSchema,
} from '../utils/schemas.js';
```

Nota: `baseSchema` ya no se importa si no se usa directamente en el archivo. Si aparece usado en alguna tool, conservarlo.

- [ ] **Step 2: Eliminar tools fantasmas**

Buscar y eliminar completamente los siguientes bloques `nombre: { ... },` dentro de `createArticleTools`:

- `move_articles` (linea ~207)
- `get_my_articles` (linea ~231)
- `list_related_articles` (linea ~359)
- `add_related_articles` (linea ~370)
- `remove_related_article` (linea ~383)
- `mark_article_as_viewed` (linea ~426)

Conservar sus comas y llaves balanceadas en el objeto que devuelve la funcion.

- [ ] **Step 3: Actualizar search_articles para nuevo path**

La tool `search_articles` ya usa `api.articles.searchArticles` (que internamente ahora apunta a `/articles/search`), asi que **no cambia la tool** — solo el servicio. Verificar que sigue compilando.

- [ ] **Step 4: Actualizar restore_articles_from_trash y delete_articles_permanently**

Las tools ya llaman `api.articles.restoreFromTrash(...)` y `api.articles.deleteArticles(...)`. El cambio de path esta en el servicio. Confirmar que **no cambia la tool**.

- [ ] **Step 5: Renombrar list_article_versions -> list_article_history**

Localizar la tool `list_article_versions`. Reemplazar el bloque completo:

```typescript
    list_article_versions: {
      description: 'Lista las versiones de un articulo',
      parameters: listVersionsSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        const versions = await api.articles.listVersions(args.article_id);
        return toolResult(versions);
      },
    },
```

por:

```typescript
    list_article_history: {
      description: 'Lista el historial de cambios de un articulo.',
      parameters: listArticleHistorySchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        const history = await api.articles.listArticleHistory(args.article_id);
        return toolResult(history);
      },
    },
```

- [ ] **Step 6: Renombrar get_article_version -> get_history_entry**

Reemplazar:

```typescript
    get_article_version: {
      description: 'Obtiene una version especifica de un articulo',
      parameters: getVersionSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        const version = await api.articles.getVersion(args.article_id, args.version);
        return toolResult(version);
      },
    },
```

por:

```typescript
    get_history_entry: {
      description: 'Obtiene una entrada especifica del historial de un articulo.',
      parameters: getHistoryEntrySchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        const entry = await api.articles.getHistoryEntry(args.article_id, args.entry_id);
        return toolResult(entry);
      },
    },
```

- [ ] **Step 7: Adaptar get_article_translation (faltaba schema antes — agregarlo)**

Si no existe una tool `get_article_translation`, anadir despues de `list_article_translations`:

```typescript
    get_article_translation: {
      description: 'Obtiene una traduccion especifica de un articulo por su locale.',
      parameters: getTranslationSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        const translation = await api.articles.getTranslation(args.article_id, args.locale);
        return toolResult(translation);
      },
    },
```

- [ ] **Step 8: Adaptar update_article_translation a locale**

Reemplazar:

```typescript
    update_article_translation: {
      description: 'Actualiza una traduccion existente',
      parameters: updateTranslationSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        const translation = await api.articles.updateTranslation(
          args.article_id,
          args.translation_id,
          { title: args.title, answer: args.answer, status: args.status }
        );
        return toolResult(translation);
      },
    },
```

por:

```typescript
    update_article_translation: {
      description: 'Actualiza una traduccion existente (identificada por locale).',
      parameters: updateTranslationSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        const translation = await api.articles.updateTranslation(
          args.article_id,
          args.locale,
          { title: args.title, answer: args.answer, status: args.status }
        );
        return toolResult(translation);
      },
    },
```

- [ ] **Step 9: Renombrar delete_article_translation -> move_article_translation_to_trash**

Reemplazar:

```typescript
    delete_article_translation: {
      description: 'Elimina una traduccion',
      parameters: deleteTranslationSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        await api.articles.deleteTranslation(args.article_id, args.translation_id);
        return toolResult({ success: true });
      },
    },
```

por:

```typescript
    move_article_translation_to_trash: {
      description: 'Mueve una traduccion a la papelera (identificada por locale).',
      parameters: moveTranslationToTrashSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        await api.articles.moveTranslationToTrash(args.article_id, args.locale);
        return toolResult({ success: true, message: 'Translation moved to trash' });
      },
    },
```

- [ ] **Step 10: Renombrar list_article_attachments y adaptar a locale**

Reemplazar:

```typescript
    list_article_attachments: {
      description: 'Lista los adjuntos de un articulo',
      parameters: listAttachmentsSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        const attachments = await api.articles.listAttachments(args.article_id);
        return toolResult(attachments);
      },
    },
```

por:

```typescript
    list_article_translation_attachments: {
      description: 'Lista los adjuntos de una traduccion de articulo.',
      parameters: listTranslationAttachmentsSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        const attachments = await api.articles.listTranslationAttachments(args.article_id, args.locale);
        return toolResult(attachments);
      },
    },
```

- [ ] **Step 11: Renombrar delete_article_attachment a dissociate_article_attachments**

Reemplazar:

```typescript
    delete_article_attachment: {
      description: 'Elimina un adjunto de un articulo',
      parameters: deleteAttachmentSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        await api.articles.deleteAttachment(args.article_id, args.attachment_id);
        return toolResult({ success: true });
      },
    },
```

por:

```typescript
    dissociate_article_attachments: {
      description: 'Desasocia uno o mas adjuntos de una traduccion de articulo.',
      parameters: dissociateAttachmentsSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        await api.articles.dissociateAttachments(
          args.article_id,
          args.locale,
          args.attachment_ids
        );
        return toolResult({ success: true, count: args.attachment_ids.length });
      },
    },
```

- [ ] **Step 12: Adaptar like_article y dislike_article a locale**

Reemplazar:

```typescript
    like_article: {
      description: 'Registra like en un articulo',
      parameters: articleFeedbackSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        await api.articles.likeArticle(args.article_id);
        return toolResult({ success: true });
      },
    },
```

por:

```typescript
    like_article: {
      description: 'Registra like en una traduccion de articulo (requiere locale).',
      parameters: articleFeedbackSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        await api.articles.likeArticle(args.article_id, args.locale);
        return toolResult({ success: true });
      },
    },
```

Y similar para `dislike_article`:

```typescript
    dislike_article: {
      description: 'Registra dislike en una traduccion de articulo (requiere locale).',
      parameters: articleFeedbackSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        await api.articles.dislikeArticle(args.article_id, args.locale);
        return toolResult({ success: true });
      },
    },
```

- [ ] **Step 13: Build**

Run: `npm run build`
Expected: aun fallos en `tools/categories.ts` y `tools/sections.ts` (se resuelven en Tasks 10-11). Si hay errores en `tools/articles.ts`, pausar y reportar.

- [ ] **Step 14: Commit**

```bash
git add src/tools/articles.ts
git commit -m "refactor(tools/articles): sincronizar con services y eliminar fantasmas

Renombres:
- list_article_versions -> list_article_history
- get_article_version -> get_history_entry
- delete_article_translation -> move_article_translation_to_trash
- list_article_attachments -> list_article_translation_attachments
- delete_article_attachment -> dissociate_article_attachments

Agregada: get_article_translation (antes no existia).

Breaking (nuevo parametro locale):
- update_article_translation, like_article, dislike_article

Eliminadas (fantasmas):
- move_articles, get_my_articles, list_related_articles,
  add_related_articles, remove_related_article, mark_article_as_viewed"
```

---

## Task 10: Adaptar tools/categories.ts

**Files:**
- Modify: `src/tools/categories.ts`

**Por que:** Eliminar tools que referencian metodos de servicio borrados, adaptar `get_category_tree` al nuevo parametro `root_category_id`.

- [ ] **Step 1: Actualizar imports**

Eliminar del import los schemas de sub-categorias y legacy. Conservar solo los usados:

```typescript
import {
  listRootCategoriesSchema,
  getRootCategorySchema,
  createRootCategorySchema,
  updateRootCategorySchema,
  deleteRootCategorySchema,
  getCategoryTreeSchema,
} from '../utils/schemas.js';
```

- [ ] **Step 2: Eliminar tools de sub-categorias y legacy**

Eliminar bloques completos de:

- `list_categories` (linea ~105)
- `get_category` (linea ~120)
- `create_category` (linea ~143)
- `update_category` (linea ~159)
- `move_category_to_trash` (linea ~175)
- `restore_category` (linea ~188)
- `delete_category` (linea ~201)
- `list_trashed_categories` (linea ~219)
- `list_all_categories` (linea ~237)

Dejar solo: `list_root_categories`, `get_root_category`, `create_root_category`, `update_root_category`, `delete_root_category`, `get_category_tree`.

- [ ] **Step 3: Adaptar get_category_tree al nuevo parametro**

La tool existente usa `args.category_id`. Reemplazar:

```typescript
    get_category_tree: {
      description: 'Obtiene el arbol de categorias',
      parameters: getCategoryTreeSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        const tree = await api.categories.getCategoryTree(args.category_id);
        return toolResult(tree);
      },
    },
```

por:

```typescript
    get_category_tree: {
      description: 'Obtiene el arbol completo de una categoria raiz (con subcategorias y secciones).',
      parameters: getCategoryTreeSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        const tree = await api.categories.getCategoryTree(args.root_category_id);
        return toolResult(tree);
      },
    },
```

- [ ] **Step 4: Verificar delete_root_category**

La tool `delete_root_category` debe llamar `api.categories.moveRootCategoryToTrash` (el servicio no tiene un delete duro). Verificar el cuerpo:

```typescript
    delete_root_category: {
      description: 'Mueve una categoria raiz a la papelera.',
      parameters: deleteRootCategorySchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        await api.categories.moveRootCategoryToTrash(args.category_id);
        return toolResult({ success: true, message: 'Root category moved to trash' });
      },
    },
```

Si el nombre del metodo en el servicio es distinto, alinear. En service es `moveRootCategoryToTrash`.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: solo errores en `tools/sections.ts` (Task 11 los resuelve).

- [ ] **Step 6: Commit**

```bash
git add src/tools/categories.ts
git commit -m "refactor(tools/categories): eliminar tools sin respaldo + adaptar tree

Eliminadas (metodos de servicio borrados):
- list_categories, get_category, create_category, update_category,
  move_category_to_trash, restore_category, delete_category,
  list_trashed_categories, list_all_categories

Adaptada:
- get_category_tree ahora recibe root_category_id (era category_id)

Conservadas: list_root_categories, get_root_category, create_root_category,
update_root_category, delete_root_category (=moveToTrash), get_category_tree."
```

---

## Task 11: Adaptar tools/sections.ts

**Files:**
- Modify: `src/tools/sections.ts`

**Por que:** Sections ahora usa endpoints planos; cambia firma de casi todas las tools.

- [ ] **Step 1: Actualizar imports**

Al principio de `src/tools/sections.ts`, ajustar el import de schemas:

```typescript
import {
  listSectionsSchema,
  getSectionSchema,
  createSectionSchema,
  updateSectionSchema,
  moveSectionToTrashSchema,
} from '../utils/schemas.js';
```

Eliminar schemas que ya no existen: `deleteSectionSchema`.

- [ ] **Step 2: Reescribir list_sections**

Reemplazar la tool `list_sections` completa:

```typescript
    list_sections: {
      description: 'Lista las secciones de una categoria.',
      parameters: listSectionsSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        const sections = await api.sections.listSections(args.category_id, {
          from: args.from,
          limit: args.limit,
          isTrashed: args.is_trashed,
        });
        return toolResult(sections);
      },
    },
```

- [ ] **Step 3: Reescribir get_section**

```typescript
    get_section: {
      description: 'Obtiene una seccion por su ID.',
      parameters: getSectionSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        const section = await api.sections.getSection(args.section_id);
        return toolResult(section);
      },
    },
```

- [ ] **Step 4: Reescribir create_section**

```typescript
    create_section: {
      description: 'Crea una nueva seccion dentro de una categoria.',
      parameters: createSectionSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        const section = await api.sections.createSection(args.category_id, {
          name: args.name,
          description: args.description,
          displayOrder: args.display_order,
          visibility: args.visibility,
        });
        return toolResult(section);
      },
    },
```

- [ ] **Step 5: Reescribir update_section**

```typescript
    update_section: {
      description: 'Actualiza una seccion existente.',
      parameters: updateSectionSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        const section = await api.sections.updateSection(args.section_id, {
          name: args.name,
          description: args.description,
          displayOrder: args.display_order,
          visibility: args.visibility,
        });
        return toolResult(section);
      },
    },
```

- [ ] **Step 6: Reescribir move_section_to_trash**

```typescript
    move_section_to_trash: {
      description: 'Mueve una seccion a la papelera.',
      parameters: moveSectionToTrashSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        await api.sections.moveSectionToTrash(args.section_id);
        return toolResult({ success: true, message: 'Section moved to trash' });
      },
    },
```

- [ ] **Step 7: Eliminar restore_section, delete_section, list_trashed_sections**

Eliminar estos bloques completos. Los metodos del servicio ya no existen.

- [ ] **Step 8: Build**

Run: `npm run build`
Expected: PASS. Si hay cualquier error, reportar.

- [ ] **Step 9: Commit**

```bash
git add src/tools/sections.ts
git commit -m "refactor(tools/sections): migrar a endpoints planos /kbSections

Cambios de firma:
- list_sections(category_id, ...)  // era (root_category_id, category_id, ...)
- get_section(section_id)  // era (root_category_id, category_id, section_id)
- create_section(category_id, ...)
- update_section(section_id, ...)
- move_section_to_trash(section_id)

Eliminadas (metodos de servicio borrados):
- restore_section, delete_section, list_trashed_sections"
```

---

## Task 12: Actualizar smoke test con 8 checks encadenados

**Files:**
- Modify: `scripts/smoke-test.mjs`

**Por que:** El smoke test actual excluye endpoints que ahora funcionan. Debe validar toda la cadena con datos descubiertos en runtime.

- [ ] **Step 1: Reescribir el archivo completo**

Reemplazar el contenido de `scripts/smoke-test.mjs` por:

```javascript
#!/usr/bin/env node
/**
 * Smoke test end-to-end de mcp_desk_docs.
 *
 * Requisitos:
 * - Haber ejecutado zoho_setup + zoho_connect previamente (via MCP o CLI),
 *   o tener ZOHO_CLIENT_ID/SECRET/REFRESH_TOKEN en .env.
 *
 * Ejecuta 8 checks encadenados que descubren datos reales en runtime.
 * Exit code 0 si todas pasan, 1 si alguna falla.
 */

import { loadConfig } from '../dist/utils/config.js';
import { ZohoDeskAPI } from '../dist/client/index.js';
import { createAllTools } from '../dist/tools/index.js';

async function runCheck(name, fn) {
  try {
    await fn();
    console.error(`[OK]   ${name}`);
    return { ok: true };
  } catch (err) {
    const msg = err?.message || String(err);
    console.error(`[FAIL] ${name}: ${msg}`);
    return { ok: false, name, msg };
  }
}

async function main() {
  console.error('=== mcp_desk_docs smoke test (expandido) ===\n');

  const config = await loadConfig();
  const api = new ZohoDeskAPI(config);
  const tools = createAllTools(api, config);

  const callTool = async (name, args) => {
    const tool = tools[name];
    if (!tool) throw new Error(`Tool ${name} no registrada`);
    const parsed = tool.parameters.parse(args);
    return tool.execute(parsed);
  };

  const state = {};
  const failures = [];

  // 1. Connection status
  const r1 = await runCheck('zoho_connection_status', async () => {
    const r = await callTool('zoho_connection_status', {});
    const text = r.content?.[0]?.text || '';
    if (!/\bCONNECTED\b/.test(text)) {
      throw new Error(`Esperaba CONNECTED, recibido: ${text.split('\n')[3] || text}`);
    }
  });
  if (!r1.ok) failures.push(r1);

  // 2. List organizations
  const r2 = await runCheck('list_organizations', async () => {
    const r = await callTool('list_organizations', {});
    const data = JSON.parse(r.content[0].text);
    if (!Array.isArray(data) || data.length === 0) throw new Error('Esperaba al menos 1 organizacion');
  });
  if (!r2.ok) failures.push(r2);

  // 3. List departments
  const r3 = await runCheck('list_departments', async () => {
    const r = await callTool('list_departments', { from: 1, limit: 10 });
    const data = JSON.parse(r.content[0].text);
    if (!Array.isArray(data)) throw new Error('Esperaba array');
  });
  if (!r3.ok) failures.push(r3);

  // 4. List articles (from=1)
  const r4 = await runCheck('list_articles', async () => {
    const r = await callTool('list_articles', { from: 1, limit: 1 });
    const parsed = JSON.parse(r.content[0].text);
    const ok = Array.isArray(parsed) || (parsed && 'data' in parsed);
    if (!ok) throw new Error('Esperaba array o {data: [...]}');
    state.firstArticleId = (Array.isArray(parsed) ? parsed : parsed.data)?.[0]?.id;
  });
  if (!r4.ok) failures.push(r4);

  // 5. Search articles
  const r5 = await runCheck('search_articles', async () => {
    const r = await callTool('search_articles', { search_str: 'test', from: 1, limit: 1 });
    const parsed = JSON.parse(r.content[0].text);
    const ok = Array.isArray(parsed) || (parsed && 'data' in parsed);
    if (!ok) throw new Error('Esperaba array o {data: [...]}');
  });
  if (!r5.ok) failures.push(r5);

  // 6. List root categories
  const r6 = await runCheck('list_root_categories', async () => {
    const r = await callTool('list_root_categories', { from: 1, limit: 5 });
    const parsed = JSON.parse(r.content[0].text);
    const arr = Array.isArray(parsed) ? parsed : parsed.data;
    if (!Array.isArray(arr)) throw new Error('Esperaba array o {data:[...]}');
    state.firstRootCategoryId = arr[0]?.id;
    state.hasRootCategories = arr.length > 0;
  });
  if (!r6.ok) failures.push(r6);

  // 7. Get category tree (depende de step 6)
  const r7 = await runCheck('get_category_tree', async () => {
    if (!state.firstRootCategoryId) {
      throw new Error('SKIP: no hay root categories en la org de prueba');
    }
    const r = await callTool('get_category_tree', { root_category_id: state.firstRootCategoryId });
    const data = JSON.parse(r.content[0].text);
    if (!data) throw new Error('Respuesta vacia');
    // Guardar primera categoria hija si existe para paso 8
    const childCategories = data.childCategories || data.categories;
    if (Array.isArray(childCategories) && childCategories.length > 0) {
      state.firstChildCategoryId = childCategories[0].id;
    }
  });
  if (!r7.ok) failures.push(r7);

  // 8. List sections (depende de step 7)
  const r8 = await runCheck('list_sections', async () => {
    const categoryId = state.firstChildCategoryId || state.firstRootCategoryId;
    if (!categoryId) {
      throw new Error('SKIP: no hay categoria para listar secciones');
    }
    const r = await callTool('list_sections', { category_id: categoryId, from: 1, limit: 1 });
    const parsed = JSON.parse(r.content[0].text);
    const ok = Array.isArray(parsed) || (parsed && 'data' in parsed);
    if (!ok) throw new Error('Esperaba array o {data:[...]}');
  });
  if (!r8.ok) failures.push(r8);

  const passed = 8 - failures.length;
  console.error(`\n=== Resultado: ${passed} OK, ${failures.length} FAIL ===`);

  if (failures.length > 0) {
    console.error('\nFallas:');
    failures.forEach(f => console.error(`  - ${f.name}: ${f.msg}`));
    process.exit(1);
  }
  process.exit(0);
}

main().catch(err => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Build y test**

Run: `npm run smoke`
Expected: `=== Resultado: 8 OK, 0 FAIL ===` (o menos OKs si la org no tiene alguna de las entidades probadas — p.ej. sin root categories pasara el 6 como empty y el 7 lanzara error de "SKIP"). En caso de fallos reales, reportar.

Nota: si el tenant de prueba no tiene root categories configuradas, el step 6 devolvera data vacia y step 7 lanzara "SKIP: no hay root categories". Eso se cuenta como FAIL en este script; idealmente crearias una root category de prueba desde la UI de Zoho para que pase. Si el tenant es minimo (solo articles/departments), el smoke pasara 5/8 — documentar en el commit.

- [ ] **Step 3: Commit**

```bash
git add scripts/smoke-test.mjs
git commit -m "test(smoke): expandir a 8 checks encadenados con descubrimiento runtime

Checks nuevos:
5. search_articles - valida fix /articles/search
6. list_root_categories - valida fix /kbRootCategories
7. get_category_tree - depende de paso 6 (root_category_id real)
8. list_sections - depende de paso 7 (category_id real)

Cada check que sigue a otro usa IDs reales descubiertos en el anterior,
no valores ficticios. Si el tenant carece de una entidad (ej: sin root
categories), los checks dependientes fallan con mensaje 'SKIP: ...'."
```

---

## Task 13: Verificar endpoint de translation creation (validacion runtime)

**Files:**
- (solo verificacion, posible Modify: `src/client/services/articles.ts`)

**Por que:** `createTranslation` sigue usando `POST /articles/{id}/translations` sin locale en path. Verificar que este endpoint exista tal cual en docs — la auditoria indico que tanto `POST /articles/{id}/translations` como `/translations/{locale}/...` coexisten.

- [ ] **Step 1: Verificar en docs**

Run:

```bash
grep -onE "POST /api/v1/articles/\{articleId\}/translations[^/]" "Zoho Desk API Documentation.html" | head -3
```

Expected: al menos un match confirmando que `POST /articles/{articleId}/translations` es valido.

Si el match existe: **no hay cambio de codigo necesario**. Saltar a Step 3.

Si no hay match claro: investigar que path documentado crea una translation. Podria ser un endpoint con `locale` en query o body.

- [ ] **Step 2: Si hay cambio, aplicarlo**

En caso de que el endpoint correcto sea diferente, modificar `src/client/services/articles.ts` linea 245 aprox:

```typescript
    return this._client.post<ZohoDeskTranslation>(`/articles/${articleId}/translations`, payload);
```

ajustando path o payload segun lo documentado.

- [ ] **Step 3: Commit (solo si hubo cambio)**

```bash
git add src/client/services/articles.ts
git commit -m "verify(articles): confirmar endpoint createTranslation

Validado contra Zoho Desk API Documentation.html. Endpoint correcto
confirmado: POST /api/v1/articles/{articleId}/translations con locale
en el body."
```

Si no hubo cambio, omitir este commit.

---

## Task 14: Limpiar tipos no usados en zoho-desk.ts

**Files:**
- Modify: `src/types/zoho-desk.ts`

**Por que:** Tras eliminar metodos y tools, varios tipos quedaron sin consumidores: `RelatedArticle`, `MyArticlesResponse`, `CategoryPermission`, `BulkMoveDTO`, `BulkTrashDTO`, `BulkRestoreDTO`, `BulkDeleteDTO`.

- [ ] **Step 1: Verificar cuales tipos quedaron huerfanos**

Run:

```bash
grep -rn "RelatedArticle\|MyArticlesResponse\|CategoryPermission\|BulkMoveDTO\|BulkTrashDTO\|BulkRestoreDTO\|BulkDeleteDTO" src/
```

Cualquier tipo que solo aparezca en su declaracion (`src/types/zoho-desk.ts`) y no en ningun consumidor es huerfano.

- [ ] **Step 2: Eliminar tipos huerfanos de src/types/zoho-desk.ts**

Para cada tipo confirmado como huerfano, eliminar su interface completa del archivo:

- `RelatedArticle`
- `MyArticlesResponse`
- `CategoryPermission`
- `BulkMoveDTO`
- `BulkTrashDTO`
- `BulkRestoreDTO`
- `BulkDeleteDTO`

Conservar los tipos que aun tienen consumidores (por ejemplo `ZohoDeskAttachment`, `ZohoDeskArticleVersion`, etc.).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/types/zoho-desk.ts
git commit -m "chore(types): eliminar tipos huerfanos tras purga de metodos fantasmas

Eliminados (sin consumidores tras fix endpoints):
- RelatedArticle, MyArticlesResponse, CategoryPermission
- BulkMoveDTO, BulkTrashDTO, BulkRestoreDTO, BulkDeleteDTO"
```

---

## Task 15: Actualizar documentacion (README + TOOLS_REFERENCE)

**Files:**
- Modify: `README.md`
- Modify: `TOOLS_REFERENCE.md`

**Por que:** El catalogo documentado debe reflejar las tools reales tras renombres y eliminaciones.

- [ ] **Step 1: Actualizar tabla/lista de tools en README.md**

Leer `README.md` y localizar la seccion de tools (probablemente bajo "Tools disponibles" o similar). Ajustar:

- Eliminar menciones de: `move_articles`, `get_my_articles`, `list_related_articles`, `add_related_articles`, `remove_related_article`, `mark_article_as_viewed`, `list_categories`, `get_category`, `create_category`, `update_category`, `move_category_to_trash`, `restore_category`, `delete_category`, `list_trashed_categories`, `list_all_categories`, `delete_section`, `restore_section`, `list_trashed_sections`.
- Renombrar menciones de: `list_article_versions` -> `list_article_history`, `get_article_version` -> `get_history_entry`, `delete_article_translation` -> `move_article_translation_to_trash`, `list_article_attachments` -> `list_article_translation_attachments`, `delete_article_attachment` -> `dissociate_article_attachments`.
- Agregar mencion de: `get_article_translation`.
- Documentar que `like_article`, `dislike_article`, `update_article_translation`, `get_article_translation`, `list_article_translation_attachments`, `dissociate_article_attachments`, `move_article_translation_to_trash` requieren `locale` ademas de `article_id`.
- Documentar que `list_sections` recibe `category_id` (no `root_category_id` + `category_id`) y que `get_section`, `update_section`, `move_section_to_trash` reciben solo `section_id`.
- Documentar que `get_category_tree` recibe `root_category_id`.

- [ ] **Step 2: Actualizar TOOLS_REFERENCE.md**

Aplicar los mismos cambios al archivo `TOOLS_REFERENCE.md` — es la referencia detallada por tool con parametros.

Revisar que cada tool documentada exista en el codigo (`grep` de nombres de tools vs contenido). Eliminar la documentacion de tools que ya no existen. Anadir documentacion para `get_article_translation` si no la tenia.

- [ ] **Step 3: Verificar que no queden nombres obsoletos**

Run:

```bash
grep -nE "(list_article_versions|get_article_version|delete_article_translation|list_article_attachments|delete_article_attachment|list_related_articles|add_related_articles|remove_related_article|mark_article_as_viewed|move_articles|get_my_articles|list_trashed_categories|list_all_categories|delete_section|restore_section|list_trashed_sections)" README.md TOOLS_REFERENCE.md
```

Expected: sin resultados. Si aparecen, reemplazar por el nuevo nombre o eliminar.

- [ ] **Step 4: Commit**

```bash
git add README.md TOOLS_REFERENCE.md
git commit -m "docs: actualizar catalogo de tools tras fix endpoints

- Eliminadas referencias a tools fantasmas (move_articles, get_my_articles,
  list_related_*, mark_article_as_viewed, sub-categorias, legacy sections)
- Renombradas: versions -> history, delete_translation -> move_*_to_trash,
  attachments -> translation_attachments
- Documentado nuevo parametro locale obligatorio en translations,
  attachments y like/dislike
- Documentado que sections usa category_id / section_id (modelo plano)
- Agregada get_article_translation"
```

---

## Task 16: Validacion final end-to-end

**Por que:** Verificar que todo funciona junto: build limpio desde cero, smoke 8/8, tools listadas correctamente.

- [ ] **Step 1: Build completo desde cero**

Run: `rm -rf dist && npm run build`
Expected: PASS, sin errores ni warnings.

- [ ] **Step 2: Ejecutar smoke**

Run: `npm run smoke`
Expected: `=== Resultado: 8 OK, 0 FAIL ===`. Si alguna falla es por ausencia de datos en el tenant (ej: sin root categories), considerar crear datos minimos de prueba desde la UI de Zoho. Documentar cualquier limitacion.

- [ ] **Step 3: Grep de endpoints obsoletos**

Run:

```bash
grep -rn "/kbCategories\b" src/
```

Expected: **sin resultados**. `/kbCategories` (sin `Root`) no debe aparecer en ningun sitio del codigo.

Run:

```bash
grep -rn "/articles/restore\|/articles/delete\|/articles/move\b\|/myArticles\|/articles/permaLink\|/kbArticles/search\|/articles/.*versions\|/relatedArticles\|/articles/.*/like$\|/articles/.*/dislike$" src/
```

Expected: sin resultados (todos los endpoints viejos eliminados o redirigidos).

- [ ] **Step 4: Listar tools expuestas**

Verificar los nombres de tools registradas ejecutando (desde node):

```bash
node -e "
import('./dist/utils/config.js').then(async ({loadConfig}) => {
  const {ZohoDeskAPI} = await import('./dist/client/index.js');
  const {createAllTools} = await import('./dist/tools/index.js');
  const config = await loadConfig();
  const api = new ZohoDeskAPI(config);
  const tools = createAllTools(api, config);
  console.log(Object.keys(tools).sort().join('\n'));
});
"
```

Expected output debe INCLUIR: `get_article_translation`, `list_article_history`, `get_history_entry`, `move_article_translation_to_trash`, `list_article_translation_attachments`, `dissociate_article_attachments`.

Expected output NO debe incluir: `move_articles`, `get_my_articles`, `list_related_articles`, `add_related_articles`, `remove_related_article`, `mark_article_as_viewed`, `list_categories`, `get_category`, `create_category`, `update_category`, `move_category_to_trash`, `restore_category`, `delete_category`, `list_trashed_categories`, `list_all_categories`, `list_article_versions`, `get_article_version`, `delete_article_translation`, `list_article_attachments`, `delete_article_attachment`, `delete_section`, `restore_section`, `list_trashed_sections`.

- [ ] **Step 5: Push de la rama dev**

```bash
git push origin dev
```

Expected: push exitoso.

- [ ] **Step 6: Commit final si hubo algun ajuste**

Si en pasos 1-4 encontraste problemas que requirieron cambios:

```bash
git add -A
git commit -m "fix: ajustes finales de validacion end-to-end fix endpoints"
git push origin dev
```

---

## Notas de implementacion

- **Orden estricto de tasks**: cada task asume que las anteriores estan en HEAD. Build temporalmente roto entre Tasks 2 y 9 (errores en tools que referencian metodos eliminados); se resuelven progresivamente.
- **Sin tests unitarios**: validacion es solo el smoke end-to-end contra tenant real.
- **Para implementar**: usar `superpowers:subagent-driven-development` con subagentes frescos por task.
- **Breaking changes esperados**: cualquier cliente MCP que dependa de los nombres viejos rompera. MCP en prototipo, autorizado.

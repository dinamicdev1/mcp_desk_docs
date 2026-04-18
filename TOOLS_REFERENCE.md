# Referencia de Herramientas - MCP Zoho Desk Docs

Este documento describe todas las herramientas disponibles en el servidor MCP de Zoho Desk para gestión de la base de conocimientos.

## Parámetros Comunes

Todas las herramientas de dominio aceptan opcionalmente:

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `refresh_token` | string | ❌ | Token OAuth de Zoho. Si se omite, se usa el guardado por `zoho_setup` + `zoho_connect` |
| `org_id` | string | ❌ | ID de organización. Si se omite, se usa el configurado |

---

## OAuth (6 herramientas)

### zoho_setup

Configura client_id, client_secret y región.

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `client_id` | string | ✅ | Client ID de la app Zoho |
| `client_secret` | string | ✅ | Client Secret |
| `region` | string | ✅ | Región: `com`, `eu`, `in`, `com.au`, `jp` |
| `org_id` | string | ❌ | ID de organización (opcional, se auto-detecta) |

---

### zoho_connect

Autenticación OAuth interactiva (abre navegador).

**Parámetros:** Ninguno requerido

---

### zoho_disconnect

Elimina credenciales persistidas.

**Parámetros:** Ninguno

---

### zoho_connection_status

Verifica estado de conexión y org activa.

**Parámetros:** Ninguno

---

### zoho_oauth_get_url

Genera URL de autorización manualmente (sin abrir navegador).

**Parámetros:** Ninguno

---

### zoho_oauth_exchange_code

Intercambia un código de autorización por un refresh token.

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `code` | string | ✅ | Código de autorización del callback |

---

## Meta / Organizaciones (1 herramienta)

### list_organizations

Lista las organizaciones accesibles con el token actual.

**Parámetros:** Ninguno adicional

---

## Artículos (21 herramientas)

### list_articles

Lista artículos de la base de conocimientos con filtros opcionales.

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `from` | number | ❌ | Índice de inicio (min: 1, default: 1) |
| `limit` | number | ❌ | Cantidad a obtener (default: 50, max: 100) |
| `category_id` | string | ❌ | Filtrar por categoría |
| `status` | string | ❌ | Draft, In Review, Approved, Published, Unpublished |
| `sort_by` | string | ❌ | createdTime, modifiedTime, viewCount, likeCount |
| `order_by` | string | ❌ | asc, desc |

---

### get_article

Obtiene detalles completos de un artículo.

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `article_id` | string | ✅ | ID del artículo |

---

### search_articles

Busca artículos por texto.

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `search_str` | string | ✅ | Texto a buscar |
| `from` | number | ❌ | Índice de inicio (min: 1) |
| `limit` | number | ❌ | Cantidad a obtener |
| `category_id` | string | ❌ | Filtrar por categoría |
| `status` | string | ❌ | Filtrar por estado |

---

### create_article

Crea un nuevo artículo en la base de conocimientos.

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `title` | string | ✅ | Título del artículo |
| `answer` | string | ✅ | Contenido (soporta HTML) |
| `category_id` | string | ✅ | ID de la categoría |
| `status` | string | ❌ | Draft (default), In Review, Approved, Published |
| `visibility` | string | ❌ | Agents, All, Logged in Users, Custom access |
| `author_id` | string | ❌ | ID del autor |
| `expiry_date` | string | ❌ | Fecha de expiración (ISO) |
| `review_date` | string | ❌ | Fecha de revisión (ISO) |
| `seo_title` | string | ❌ | Título SEO |
| `seo_description` | string | ❌ | Descripción SEO |
| `seo_keywords` | string | ❌ | Palabras clave SEO |
| `tags` | string[] | ❌ | Etiquetas |
| `permalink` | string | ❌ | URL personalizada |

---

### update_article

Actualiza un artículo existente.

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `article_id` | string | ✅ | ID del artículo a actualizar |
| `title` | string | ❌ | Nuevo título |
| `answer` | string | ❌ | Nuevo contenido |
| `category_id` | string | ❌ | Nueva categoría |
| `status` | string | ❌ | Nuevo estado |
| `visibility` | string | ❌ | Nueva visibilidad |
| ... | ... | ... | (mismos campos opcionales que create_article) |

---

### delete_article

Mueve un artículo a la papelera.

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `article_id` | string | ✅ | ID del artículo a eliminar |

---

### restore_articles_from_trash

Restaura uno o más artículos desde la papelera.

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `article_ids` | string[] | ✅ | IDs de artículos a restaurar |

---

### delete_articles_permanently

Elimina artículos permanentemente (no recuperable).

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `article_ids` | string[] | ✅ | IDs de artículos a eliminar |

---

### list_trashed_articles

Lista artículos que están en la papelera.

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `from` | number | ❌ | Índice de inicio (min: 1) |
| `limit` | number | ❌ | Cantidad a obtener |

---

### check_permalink

Verifica si un permalink está disponible.

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `permalink` | string | ✅ | Permalink a verificar |

---

### list_article_history

Lista el historial de cambios de un artículo (`GET /articles/{id}/history`).

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `article_id` | string | ✅ | ID del artículo |

---

### get_history_entry

Obtiene una entrada específica del historial de un artículo (`GET /articles/{id}/history/{entryId}`).

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `article_id` | string | ✅ | ID del artículo |
| `entry_id` | string | ✅ | ID de la entrada de historial |

---

### list_article_translations

Lista todas las traducciones de un artículo.

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `article_id` | string | ✅ | ID del artículo |

---

### get_article_translation

Obtiene una traducción específica por su locale (`GET /articles/{id}/translations/{locale}`).

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `article_id` | string | ✅ | ID del artículo |
| `locale` | string | ✅ | Código de locale (ej: `"en"`, `"es"`, `"en-us"`) |

---

### create_article_translation

Crea una traducción para un artículo (`POST /articles/{id}/translations`).

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `article_id` | string | ✅ | ID del artículo |
| `locale` | string | ✅ | Código de locale (ej: `"es"`, `"fr"`) |
| `title` | string | ✅ | Título traducido |
| `answer` | string | ✅ | Contenido traducido |
| `status` | string | ❌ | Draft, In Review, Approved, Published |

---

### update_article_translation

Actualiza una traducción existente (identificada por locale).

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `article_id` | string | ✅ | ID del artículo |
| `locale` | string | ✅ | Código de locale (ej: `"es"`) |
| `title` | string | ❌ | Nuevo título |
| `answer` | string | ❌ | Nuevo contenido |
| `status` | string | ❌ | Nuevo estado |

---

### move_article_translation_to_trash

Mueve una traducción a la papelera (`POST /articles/{id}/translations/{locale}/moveToTrash`).

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `article_id` | string | ✅ | ID del artículo |
| `locale` | string | ✅ | Código de locale de la traducción |

---

### list_article_translation_attachments

Lista los adjuntos de una traducción de artículo (`GET /articles/{id}/translations/{locale}/attachments`).

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `article_id` | string | ✅ | ID del artículo |
| `locale` | string | ✅ | Código de locale de la traducción |

---

### dissociate_article_attachments

Quita uno o más adjuntos de una traducción de artículo (`POST /articles/{id}/translations/{locale}/dissociateAttachments`).

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `article_id` | string | ✅ | ID del artículo |
| `locale` | string | ✅ | Código de locale de la traducción |
| `attachment_ids` | string[] | ✅ | IDs de adjuntos a quitar (min: 1) |

---

### like_article

Registra like en una traducción de artículo (`POST /articles/{id}/translations/{locale}/like`).

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `article_id` | string | ✅ | ID del artículo |
| `locale` | string | ✅ | Código de locale de la traducción |

---

### dislike_article

Registra dislike en una traducción de artículo (`POST /articles/{id}/translations/{locale}/dislike`).

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `article_id` | string | ✅ | ID del artículo |
| `locale` | string | ✅ | Código de locale de la traducción |

---

## Categorías Raíz (6 herramientas)

> Todas las tools de categorías raíz usan el endpoint `/kbRootCategories`.

### list_root_categories

Lista categorías raíz.

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `from` | number | ❌ | Índice de inicio (min: 1) |
| `limit` | number | ❌ | Cantidad a obtener |
| `department_id` | string | ❌ | Filtrar por departamento |

---

### get_root_category

Obtiene detalles de una categoría raíz.

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `category_id` | string | ✅ | ID de la categoría raíz |

---

### create_root_category

Crea una nueva categoría raíz.

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `name` | string | ✅ | Nombre de la categoría |
| `description` | string | ❌ | Descripción |
| `display_order` | number | ❌ | Orden de visualización |
| `visibility` | string | ❌ | Agents, All, Logged in Users, Custom access |

---

### update_root_category

Actualiza una categoría raíz.

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `category_id` | string | ✅ | ID de la categoría raíz |
| `name` | string | ❌ | Nuevo nombre |
| `description` | string | ❌ | Nueva descripción |
| `display_order` | number | ❌ | Nuevo orden |
| `visibility` | string | ❌ | Nueva visibilidad |

---

### delete_root_category

Mueve una categoría raíz a la papelera (`POST /kbRootCategories/{id}/moveToTrash`).

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `category_id` | string | ✅ | ID de la categoría raíz |

---

### get_category_tree

Obtiene el árbol completo de una categoría raíz (con subcategorías y secciones).

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `root_category_id` | string | ✅ | ID de la categoría raíz (no `category_id`) |

---

## Secciones (5 herramientas)

> Las secciones usan endpoints planos `/kbSections`. `list_sections` recibe `category_id`; `get_section`, `update_section` y `move_section_to_trash` reciben solo `section_id`.

### list_sections

Lista las secciones de una categoría.

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `category_id` | string | ✅ | ID de la categoría |
| `from` | number | ❌ | Índice de inicio (min: 1) |
| `limit` | number | ❌ | Cantidad a obtener |
| `is_trashed` | boolean | ❌ | Filtrar por estado de papelera |

---

### get_section

Obtiene detalles de una sección.

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `section_id` | string | ✅ | ID de la sección |

---

### create_section

Crea una nueva sección en una categoría.

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `category_id` | string | ✅ | ID de la categoría padre |
| `name` | string | ✅ | Nombre de la sección |
| `description` | string | ❌ | Descripción |
| `display_order` | number | ❌ | Orden de visualización |
| `visibility` | string | ❌ | Agents, All, Logged in Users, Custom access |

---

### update_section

Actualiza una sección existente.

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `section_id` | string | ✅ | ID de la sección |
| `name` | string | ❌ | Nuevo nombre |
| `description` | string | ❌ | Nueva descripción |
| `display_order` | number | ❌ | Nuevo orden |
| `visibility` | string | ❌ | Nueva visibilidad |

---

### move_section_to_trash

Mueve una sección a la papelera.

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `section_id` | string | ✅ | ID de la sección |

---

## Departamentos (2 herramientas)

### list_departments

Lista todos los departamentos.

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `from` | number | ❌ | Índice de inicio (min: 1) |
| `limit` | number | ❌ | Cantidad a obtener |

---

### get_department

Obtiene detalles de un departamento.

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `department_id` | string | ✅ | ID del departamento |

---

## Códigos de Estado de Artículos

| Estado | Descripción |
|--------|-------------|
| `Draft` | Borrador, no visible públicamente |
| `In Review` | En revisión por moderadores |
| `Approved` | Aprobado pero no publicado |
| `Published` | Publicado y visible |
| `Unpublished` | Despublicado |

## Niveles de Visibilidad

| Visibilidad | Descripción |
|-------------|-------------|
| `All` | Visible para todos |
| `Logged in Users` | Solo usuarios autenticados |
| `Agents` | Solo agentes de soporte |
| `Custom access` | Configuración personalizada |

---

## Manejo de Errores

Los errores comunes incluyen:

| Error | Causa | Solución |
|-------|-------|----------|
| `401 Unauthorized` | Token expirado o inválido | Usar `zoho_connect` para obtener nuevo token |
| `403 Forbidden` | Sin permisos | Verificar scopes OAuth y permisos en Zoho Desk |
| `404 Not Found` | Recurso no existe | Verificar IDs |
| `429 Rate Limit` | Límite de API excedido | Esperar y reintentar |

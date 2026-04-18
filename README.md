# MCP Zoho Desk Docs

MCP Server para gestionar la base de conocimientos (Knowledge Base) de Zoho Desk. Permite crear, actualizar, buscar y organizar artículos de documentación a través del protocolo Model Context Protocol.

## Características

- **Gestión de Artículos**: Crear, actualizar, buscar y eliminar artículos de la base de conocimientos
- **Categorías y Secciones**: Organizar artículos en categorías y secciones jerárquicas
- **Traducciones**: Soporte para artículos multiidioma
- **OAuth 2.0**: Autenticación segura con Zoho, persistida en secure-storage por OS
- **Rate Limiting**: Control automático de límites de API

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/dinamicapps/mcp_desk_docs.git
cd mcp_desk_docs

# Instalar dependencias
npm install

# Compilar
npm run build
```

## Configuración

### Paso 1: Crear app OAuth en Zoho

1. Ve a [Zoho API Console](https://api-console.zoho.com/)
2. Crea una nueva aplicación "Server-based Applications"
3. Configura la Redirect URI: `http://localhost:3000/callback`
4. Copia el Client ID y Client Secret

### Paso 2: Configurar el cliente MCP

Agrega esta configuración a tu `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "zoho-desk-docs": {
      "command": "node",
      "args": ["E:/ruta/a/mcp_desk_docs/dist/index.js"]
    }
  }
}
```

No es necesario pasar variables de entorno: las credenciales se persistirán en secure-storage tras el setup inicial.

### Paso 3: Autenticar desde el cliente MCP

Una vez que el servidor está activo en Claude Desktop o Claude Code, ejecuta:

```
zoho_setup(client_id="...", client_secret="...", region="com")
zoho_connect()
```

`zoho_connect` abre el navegador para autorizar la app y guarda automáticamente el refresh token y el org ID.

Las credenciales quedan persistidas en:
- **Windows**: `%APPDATA%/mcp_desk_docs/config.json`
- **macOS**: `~/Library/Application Support/mcp_desk_docs/config.json`
- **Linux**: `$XDG_CONFIG_HOME/mcp_desk_docs/config.json`

### Alternativa: Variables de entorno

Para desarrollo local también puedes usar un archivo `.env` en la raíz del proyecto:

```env
ZOHO_CLIENT_ID=tu_client_id
ZOHO_CLIENT_SECRET=tu_client_secret
ZOHO_REGION=com                    # com, eu, in, com.au, jp
ZOHO_ORG_ID=tu_org_id              # opcional, se auto-detecta
ZOHO_OAUTH_SCOPES=Desk.articles.READ,Desk.articles.CREATE,Desk.articles.UPDATE,Desk.articles.DELETE,Desk.settings.READ
```

Con `.env` configurado, ejecuta `npm run oauth` para obtener el refresh token vía CLI.

## Herramientas Disponibles

### OAuth / Autenticación (6)

| Herramienta | Descripción |
|-------------|-------------|
| `zoho_setup` | Configura client_id, client_secret y región |
| `zoho_connect` | Autenticación OAuth interactiva (abre navegador) |
| `zoho_disconnect` | Elimina credenciales persistidas |
| `zoho_connection_status` | Verifica estado de conexión y org activa |
| `zoho_oauth_get_url` | Genera URL de autorización manualmente |
| `zoho_oauth_exchange_code` | Intercambia código de autorización por token |

### Meta / Organizaciones (1)

| Herramienta | Descripción |
|-------------|-------------|
| `list_organizations` | Lista las organizaciones accesibles con el token actual |

### Artículos (18)

| Herramienta | Descripción |
|-------------|-------------|
| `list_articles` | Lista artículos con filtros |
| `get_article` | Obtiene detalles de un artículo |
| `search_articles` | Busca artículos por texto |
| `create_article` | Crea un nuevo artículo |
| `update_article` | Actualiza un artículo existente |
| `delete_article` | Mueve artículo a papelera |
| `restore_articles_from_trash` | Restaura artículos desde papelera |
| `delete_articles_permanently` | Elimina artículos permanentemente |
| `list_trashed_articles` | Lista artículos en papelera |
| `check_permalink` | Verifica disponibilidad de permalink |
| `list_article_history` | Lista historial de cambios de un artículo |
| `get_history_entry` | Obtiene una entrada específica del historial |
| `list_article_translations` | Lista traducciones de un artículo |
| `get_article_translation` | Obtiene una traducción por locale (`article_id` + `locale`) |
| `create_article_translation` | Crea traducción (`article_id` + `locale` en body) |
| `update_article_translation` | Actualiza traducción (`article_id` + `locale`) |
| `move_article_translation_to_trash` | Mueve traducción a papelera (`article_id` + `locale`) |
| `list_article_translation_attachments` | Lista adjuntos de una traducción (`article_id` + `locale`) |
| `dissociate_article_attachments` | Quita adjuntos de una traducción (`article_id` + `locale` + `attachment_ids[]`) |
| `like_article` | Registra like en una traducción (`article_id` + `locale`) |
| `dislike_article` | Registra dislike en una traducción (`article_id` + `locale`) |

> **Nota sobre locale:** Las tools `get_article_translation`, `update_article_translation`, `move_article_translation_to_trash`, `list_article_translation_attachments`, `dissociate_article_attachments`, `like_article` y `dislike_article` requieren el parámetro `locale` (ej: `"en"`, `"es"`, `"en-us"`) además de `article_id`. Esto refleja que en la API de Zoho Desk las traducciones se identifican por su locale, no por un ID numérico.

### Categorías Raíz (6)

| Herramienta | Descripción |
|-------------|-------------|
| `list_root_categories` | Lista categorías raíz (usa `/kbRootCategories`) |
| `get_root_category` | Obtiene detalles de una categoría raíz |
| `create_root_category` | Crea nueva categoría raíz |
| `update_root_category` | Actualiza categoría raíz |
| `delete_root_category` | Mueve categoría raíz a papelera |
| `get_category_tree` | Obtiene árbol completo de una categoría raíz (`root_category_id`) |

### Secciones (5)

| Herramienta | Descripción |
|-------------|-------------|
| `list_sections` | Lista secciones de una categoría (`category_id`, no `root_category_id`) |
| `get_section` | Obtiene detalles de sección (`section_id` únicamente) |
| `create_section` | Crea nueva sección en una categoría (`category_id`) |
| `update_section` | Actualiza sección (`section_id` únicamente) |
| `move_section_to_trash` | Mueve sección a papelera (`section_id` únicamente) |

### Departamentos (2)

| Herramienta | Descripción |
|-------------|-------------|
| `list_departments` | Lista todos los departamentos |
| `get_department` | Obtiene detalles de departamento |

> **Nota:** Los parámetros `refresh_token` y `org_id` son opcionales en todas las tools de dominio. Si se omiten, se resuelven automáticamente desde secure-storage (configurado por `zoho_setup` + `zoho_connect`).

## Ejemplos de Uso

### Conectar con Zoho Desk

```
zoho_setup(client_id="1000.XXXXX", client_secret="YYYYY", region="com")
zoho_connect()
```

### Crear un Artículo

```
create_article(
  title="Cómo restablecer contraseña",
  answer="<p>Sigue estos pasos para restablecer tu contraseña...</p>",
  category_id="123456789",
  status="Published"
)
```

### Buscar Artículos

```
search_articles(search_term="facturación")
```

### Organizar Contenido

```
1. list_root_categories() para ver categorías raíz existentes
2. create_root_category(name="Guías de Usuario")
3. create_section(name="Inicio", category_id="...")
4. create_article(title="...", category_id="...", section_id="...")
```

## Desarrollo

```bash
# Desarrollo con hot-reload
npm run dev

# Ejecutar tests
npm test

# Smoke test end-to-end (requiere credenciales configuradas)
npm run smoke

# Lint
npm run lint

# Formatear código
npm run format
```

## Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run build` | Compila TypeScript a JavaScript |
| `npm run dev` | Modo desarrollo con hot-reload |
| `npm start` | Inicia el servidor MCP |
| `npm run oauth` | Flujo OAuth automático via CLI |
| `npm run oauth:manual` | Flujo OAuth manual |
| `npm test` | Ejecuta tests |
| `npm run smoke` | Smoke test end-to-end contra credenciales reales |

## Troubleshooting

### "Not authenticated. Use zoho_setup..."

Las credenciales no están configuradas. Ejecuta:

```
zoho_setup(client_id="...", client_secret="...", region="com")
zoho_connect()
```

### Resetear credenciales

Desde el cliente MCP:

```
zoho_disconnect()
```

O borrando el archivo de configuración manualmente:
- Windows: `del %APPDATA%\mcp_desk_docs\config.json`
- macOS/Linux: `rm ~/Library/Application\ Support/mcp_desk_docs/config.json`

### El servidor no reconoce mi org_id

Ejecuta `zoho_connection_status()` para verificar qué org está activa. Si es incorrecto, usa `list_organizations()` para ver las disponibles y `zoho_setup(org_id="...")` para fijar la correcta.

## Estructura del Proyecto

```
mcp_desk_docs/
├── src/
│   ├── index.ts                 # Entry point MCP
│   ├── oauth-cli.ts             # CLI para OAuth
│   ├── client/
│   │   ├── index.ts             # ZohoDeskAPI facade
│   │   ├── zoho-client.ts       # Cliente HTTP + OAuth
│   │   └── services/
│   │       ├── articles.ts      # Servicio de artículos
│   │       ├── categories.ts    # Servicio de categorías
│   │       ├── sections.ts      # Servicio de secciones
│   │       ├── departments.ts   # Servicio de departamentos
│   │       └── organizations.ts # Servicio de organizaciones
│   ├── tools/
│   │   ├── index.ts             # Orquestador de tools
│   │   ├── _helpers.ts          # resolveToken / resolveOrgId / toolResult
│   │   ├── oauth.ts             # Tools OAuth
│   │   ├── meta.ts              # Tools meta (list_organizations)
│   │   ├── articles.ts          # Tools de artículos
│   │   ├── categories.ts        # Tools de categorías
│   │   ├── sections.ts          # Tools de secciones
│   │   └── departments.ts       # Tools de departamentos
│   ├── types/
│   │   └── zoho-desk.ts         # Interfaces TypeScript
│   └── utils/
│       ├── config.ts            # Configuración (env + secure-storage)
│       ├── schemas.ts           # Zod schemas compartidos
│       ├── secure-storage.ts    # Persistencia de credenciales por OS
│       └── oauth-helpers.ts     # Helpers OAuth
├── scripts/
│   └── smoke-test.mjs           # Smoke test end-to-end
├── package.json
├── tsconfig.json
└── README.md
```

## API de Zoho Desk

Este MCP utiliza la [API REST de Zoho Desk](https://desk.zoho.com/DeskAPIDocument) para:

- **Base URL**: `https://desk.zoho.{region}/api/v1`
- **Autenticación**: OAuth 2.0 con header `Zoho-oauthtoken`
- **Org ID**: Requerido en header `orgId` (auto-detectado si no se especifica)

## Licencia

MIT

## Autor

DinamicApps

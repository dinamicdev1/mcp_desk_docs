# Zoho Desk Documentation MCP Server

Conector MCP (Model Context Protocol) para acceder a manuales de usuario y documentación del sistema en Zoho Desk.

MCP (Model Context Protocol) server connector to access user manuals and system documentation from Zoho Desk knowledge base.

## Features

- **Search Articles**: Search for knowledge base articles using keywords or phrases
- **Get Article Content**: Retrieve full content of specific articles by ID
- **List Categories**: Browse available knowledge base categories

## Prerequisites

- Node.js >= 18
- Zoho Desk account with API access
- Zoho OAuth access token

## Installation

```bash
npm install
npm run build
```

## Configuration

The server requires the following environment variables:

- `ZOHO_ACCESS_TOKEN`: Your Zoho OAuth access token
- `ZOHO_ORG_ID`: Your Zoho Desk organization ID
- `ZOHO_DESK_API_BASE` (optional): Base URL for Zoho Desk API (defaults to `https://desk.zoho.com/api/v1`)

### Getting Zoho Desk Credentials

1. **Organization ID**: 
   - Log in to Zoho Desk
   - Go to Setup > API > API Settings
   - Your Org ID is displayed at the top

2. **Access Token**:
   - Register your application in Zoho API Console: https://api-console.zoho.com/
   - Generate OAuth credentials (Client ID and Client Secret)
   - Use OAuth 2.0 flow to obtain an access token
   - Scopes required: `Desk.articles.READ`, `Desk.basic.READ`

### Example `.env` file

Create a `.env` file in the project root:

```env
ZOHO_ACCESS_TOKEN=1000.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ZOHO_ORG_ID=123456789
ZOHO_DESK_API_BASE=https://desk.zoho.com/api/v1
```

## Usage with Claude Desktop

Add this to your Claude Desktop configuration:

### macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
### Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "zoho-desk-docs": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp_desk_docs/dist/index.js"
      ],
      "env": {
        "ZOHO_ACCESS_TOKEN": "your_access_token_here",
        "ZOHO_ORG_ID": "your_org_id_here"
      }
    }
  }
}
```

## Available Tools

### 1. search-articles

Search for knowledge base articles.

**Parameters:**
- `query` (string, required): Search query
- `limit` (number, optional): Maximum results (1-100, default: 10)

**Example:**
```
Search for articles about "password reset"
```

### 2. get-article

Get full content of a specific article.

**Parameters:**
- `articleId` (string, required): Article ID from search results

**Example:**
```
Get article with ID "1234567890"
```

### 3. list-categories

List all knowledge base categories.

**Parameters:**
- `departmentId` (string, optional): Filter by department ID

**Example:**
```
List all categories
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Watch mode for development
npm run watch

# Run the server
npm start
```

## API Reference

This server uses the Zoho Desk REST API v1. For more information:
- [Zoho Desk API Documentation](https://desk.zoho.com/DeskAPIDocument)
- [Knowledge Base API](https://help.zoho.com/portal/en/kb/desk/developer-space/rest-apis)

## Troubleshooting

### Authentication Errors

If you receive authentication errors:
1. Verify your access token is valid and not expired
2. Check that your Org ID is correct
3. Ensure your API scopes include `Desk.articles.READ` and `Desk.basic.READ`

### No Results Found

If searches return no results:
1. Verify articles are published in your knowledge base
2. Check that articles are not restricted by permissions
3. Try different search terms

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on the GitHub repository.

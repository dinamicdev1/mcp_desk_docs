#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ZohoDeskAPI } from './client/index.js';
import { createAllTools } from './tools/index.js';
import { loadConfig } from './utils/config.js';

async function main() {
  try {
    const config = await loadConfig();
    const api = new ZohoDeskAPI(config);
    const tools = createAllTools(api, config);

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

    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: Object.entries(tools).map(([name, tool]) => ({
          name,
          description: tool.description,
          inputSchema: zodToJsonSchema(tool.parameters as any),
        })),
      };
    });

    server.setRequestHandler(CallToolRequestSchema, async request => {
      const toolName = request.params.name;
      const tool = tools[toolName as keyof typeof tools];

      if (!tool) {
        throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${toolName}`);
      }

      try {
        const validatedArgs = tool.parameters.parse(request.params.arguments);
        const result = await (tool.execute as (args: any) => Promise<any>)(validatedArgs);
        return result;
      } catch (error) {
        if (error instanceof Error) {
          throw new McpError(ErrorCode.InternalError, error.message);
        }
        throw new McpError(ErrorCode.InternalError, 'Unknown error occurred');
      }
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('Zoho Desk Docs MCP Server running on stdio');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();

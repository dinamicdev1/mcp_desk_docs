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

#!/usr/bin/env node
/**
 * Smoke test end-to-end de mcp_desk_docs.
 *
 * Requisitos:
 * - Haber ejecutado zoho_setup + zoho_connect previamente (via MCP o CLI),
 *   o tener ZOHO_CLIENT_ID/SECRET/REFRESH_TOKEN en .env.
 *
 * Ejecuta 6 checks encadenados que descubren datos reales en runtime.
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
  console.error('=== mcp_desk_docs smoke test (6 checks) ===\n');

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

  // 5. List root categories
  const r5 = await runCheck('list_root_categories', async () => {
    const r = await callTool('list_root_categories', { from: 1, limit: 5 });
    const parsed = JSON.parse(r.content[0].text);
    const arr = Array.isArray(parsed) ? parsed : parsed.data;
    if (!Array.isArray(arr)) throw new Error('Esperaba array o {data:[...]}');
    state.firstRootCategoryId = arr[0]?.id;
    state.hasRootCategories = arr.length > 0;
  });
  if (!r5.ok) failures.push(r5);

  // 6. Get category tree (depende de step 5)
  // Las secciones se obtienen embebidas en el arbol — no existe GET /kbSections (405).
  const r6 = await runCheck('get_category_tree', async () => {
    if (!state.firstRootCategoryId) {
      throw new Error('SKIP: no hay root categories en la org de prueba');
    }
    const r = await callTool('get_category_tree', { root_category_id: state.firstRootCategoryId });
    const data = JSON.parse(r.content[0].text);
    if (!data) throw new Error('Respuesta vacia');
    // Validar estructura del arbol
    const childCategories = data.childCategories || data.categories || [];
    if (!Array.isArray(childCategories)) throw new Error('childCategories debe ser un array');
    // Si hay categorias hijas, verificar que las secciones vengan embebidas (si existen)
    for (const child of childCategories) {
      if (child.sections !== undefined && !Array.isArray(child.sections)) {
        throw new Error(`child.sections debe ser un array, recibido: ${typeof child.sections}`);
      }
    }
  });
  if (!r6.ok) failures.push(r6);

  const passed = 6 - failures.length;
  console.error(`\n=== Resultado: ${passed}/6 OK, ${failures.length} FAIL ===`);

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

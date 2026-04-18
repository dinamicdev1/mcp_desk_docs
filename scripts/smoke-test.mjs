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

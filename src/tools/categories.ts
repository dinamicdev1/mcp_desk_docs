import type { ZohoDeskAPI } from '../client/index.js';
import {
  listRootCategoriesSchema,
  getRootCategorySchema,
  createRootCategorySchema,
  updateRootCategorySchema,
  deleteRootCategorySchema,
  getCategoryTreeSchema,
} from '../utils/schemas.js';
import { resolveToken, resolveOrgId, toolResult } from './_helpers.js';

export function createCategoryTools(api: ZohoDeskAPI) {

  return {
    // ============================================
    // ROOT CATEGORIES (FOLDERS)
    // ============================================

    list_root_categories: {
      description:
        'Lista todas las categorías raíz (folders) de la base de conocimientos. Las categorías raíz son el nivel superior de organización.',
      parameters: listRootCategoriesSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const categories = await api.categories.listRootCategories({
          from: args.from,
          limit: args.limit,
          departmentId: args.department_id,
        });
        return toolResult(categories);
      },
    },

    get_root_category: {
      description: 'Obtiene los detalles de una categoría raíz específica por su ID.',
      parameters: getRootCategorySchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const category = await api.categories.getRootCategory(args.category_id);
        return toolResult(category);
      },
    },

    create_root_category: {
      description: 'Crea una nueva categoría raíz (folder) en la base de conocimientos.',
      parameters: createRootCategorySchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const category = await api.categories.createRootCategory(
          {
            name: args.name,
            description: args.description,
            displayOrder: args.display_order,
            visibility: args.visibility,
          },
          args.department_id
        );
        return toolResult(category);
      },
    },

    update_root_category: {
      description: 'Actualiza una categoría raíz existente. Solo se modifican los campos proporcionados.',
      parameters: updateRootCategorySchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const category = await api.categories.updateRootCategory(args.category_id, {
          name: args.name,
          description: args.description,
          displayOrder: args.display_order,
          visibility: args.visibility,
        });
        return toolResult(category);
      },
    },

    delete_root_category: {
      description:
        'Mueve una categoría raíz a la papelera. ADVERTENCIA: Esto también afectará todas las categorías hijas, secciones y artículos.',
      parameters: deleteRootCategorySchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        await api.categories.moveRootCategoryToTrash(args.category_id);
        return toolResult({ success: true, message: 'Root category moved to trash' });
      },
    },

    // ============================================
    // ÁRBOL DE CATEGORÍAS
    // ============================================

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
  };
}

import type { ZohoDeskAPI } from '../client/index.js';
import {
  listRootCategoriesSchema,
  getRootCategorySchema,
  createRootCategorySchema,
  updateRootCategorySchema,
  deleteRootCategorySchema,
  listCategoriesSchema,
  getCategorySchema,
  getCategoryTreeSchema,
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
  baseSchema,
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
        return {
          content: [{ type: 'text' as const, text: `✅ Root category ${args.category_id} moved to trash.` }],
        };
      },
    },

    // ============================================
    // CHILD CATEGORIES (dentro de root categories)
    // ============================================

    list_categories: {
      description:
        'Lista todas las categorías hijas dentro de una categoría raíz. Las categorías organizan los artículos en grupos temáticos.',
      parameters: listCategoriesSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const categories = await api.categories.listCategories(args.root_category_id, {
          from: args.from,
          limit: args.limit,
        });
        return toolResult(categories);
      },
    },

    get_category: {
      description: 'Obtiene los detalles de una categoría específica dentro de una categoría raíz.',
      parameters: getCategorySchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const category = await api.categories.getCategory(args.root_category_id, args.category_id);
        return toolResult(category);
      },
    },

    get_category_tree: {
      description:
        'Obtiene el árbol completo de una categoría, incluyendo sus secciones y subcategorías. Útil para ver la estructura jerárquica.',
      parameters: getCategoryTreeSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const tree = await api.categories.getCategoryTree(args.category_id);
        return toolResult(tree);
      },
    },

    create_category: {
      description: 'Crea una nueva categoría dentro de una categoría raíz.',
      parameters: createCategorySchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const category = await api.categories.createCategory(args.root_category_id, {
          name: args.name,
          description: args.description,
          displayOrder: args.display_order,
          visibility: args.visibility,
        });
        return toolResult(category);
      },
    },

    update_category: {
      description: 'Actualiza una categoría existente. Solo se modifican los campos proporcionados.',
      parameters: updateCategorySchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const category = await api.categories.updateCategory(args.root_category_id, args.category_id, {
          name: args.name,
          description: args.description,
          displayOrder: args.display_order,
          visibility: args.visibility,
        });
        return toolResult(category);
      },
    },

    move_category_to_trash: {
      description: 'Mueve una categoría a la papelera.',
      parameters: deleteCategorySchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        await api.categories.moveCategoryToTrash(args.root_category_id, args.category_id);
        return {
          content: [{ type: 'text' as const, text: `✅ Category ${args.category_id} moved to trash.` }],
        };
      },
    },

    restore_category: {
      description: 'Restaura una categoría de la papelera.',
      parameters: deleteCategorySchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        await api.categories.restoreCategory(args.root_category_id, args.category_id);
        return {
          content: [{ type: 'text' as const, text: `✅ Category ${args.category_id} restored from trash.` }],
        };
      },
    },

    delete_category: {
      description:
        'Elimina permanentemente una categoría. ADVERTENCIA: Debe estar en la papelera primero.',
      parameters: deleteCategorySchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        await api.categories.deleteCategory(args.root_category_id, args.category_id);
        return {
          content: [{ type: 'text' as const, text: `✅ Category ${args.category_id} permanently deleted.` }],
        };
      },
    },

    // ============================================
    // CATEGORÍAS EN PAPELERA
    // ============================================

    list_trashed_categories: {
      description: 'Lista categorías que están en la papelera.',
      parameters: listCategoriesSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const categories = await api.categories.listTrashedCategories(args.root_category_id, {
          from: args.from,
          limit: args.limit,
        });
        return toolResult(categories);
      },
    },

    // ============================================
    // LEGACY / COMPATIBILIDAD
    // ============================================

    list_all_categories: {
      description: 'Lista todas las categorías usando el endpoint legacy. Útil para compatibilidad.',
      parameters: listRootCategoriesSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const categories = await api.categories.listAllCategories({
          from: args.from,
          limit: args.limit,
          departmentId: args.department_id,
        });
        return toolResult(categories);
      },
    },
  };
}

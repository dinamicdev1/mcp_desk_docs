import type { ZohoDeskAPI } from '../client/index.js';
import {
  listSectionsSchema,
  getSectionSchema,
  createSectionSchema,
  updateSectionSchema,
  deleteSectionSchema,
} from '../utils/schemas.js';
import { resolveToken, resolveOrgId, toolResult } from './_helpers.js';

export function createSectionTools(api: ZohoDeskAPI) {

  return {
    // ============================================
    // CRUD BÁSICO
    // ============================================

    list_sections: {
      description:
        'Lista todas las secciones de una categoría. Las secciones son subdivisiones dentro de una categoría para organizar mejor los artículos.',
      parameters: listSectionsSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const sections = await api.sections.listSections(args.root_category_id, args.category_id, {
          from: args.from,
          limit: args.limit,
        });
        return toolResult(sections);
      },
    },

    get_section: {
      description: 'Obtiene los detalles de una sección específica.',
      parameters: getSectionSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const section = await api.sections.getSection(
          args.root_category_id,
          args.category_id,
          args.section_id
        );
        return toolResult(section);
      },
    },

    create_section: {
      description: 'Crea una nueva sección dentro de una categoría.',
      parameters: createSectionSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const section = await api.sections.createSection(args.root_category_id, args.category_id, {
          name: args.name,
          description: args.description,
          displayOrder: args.display_order,
          visibility: args.visibility,
        });
        return toolResult(section);
      },
    },

    update_section: {
      description: 'Actualiza una sección existente. Solo se modifican los campos proporcionados.',
      parameters: updateSectionSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const section = await api.sections.updateSection(
          args.root_category_id,
          args.category_id,
          args.section_id,
          {
            name: args.name,
            description: args.description,
            displayOrder: args.display_order,
            visibility: args.visibility,
          }
        );
        return toolResult(section);
      },
    },

    // ============================================
    // PAPELERA Y ELIMINACIÓN
    // ============================================

    move_section_to_trash: {
      description: 'Mueve una sección a la papelera.',
      parameters: deleteSectionSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        await api.sections.moveSectionToTrash(args.root_category_id, args.category_id, args.section_id);
        return {
          content: [{ type: 'text' as const, text: `✅ Section ${args.section_id} moved to trash.` }],
        };
      },
    },

    restore_section: {
      description: 'Restaura una sección de la papelera.',
      parameters: deleteSectionSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        await api.sections.restoreSection(args.root_category_id, args.category_id, args.section_id);
        return {
          content: [{ type: 'text' as const, text: `✅ Section ${args.section_id} restored from trash.` }],
        };
      },
    },

    delete_section: {
      description:
        'Elimina permanentemente una sección. ADVERTENCIA: Los artículos de esta sección serán movidos a la categoría padre.',
      parameters: deleteSectionSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        await api.sections.deleteSection(args.root_category_id, args.category_id, args.section_id);
        return {
          content: [{ type: 'text' as const, text: `✅ Section ${args.section_id} permanently deleted.` }],
        };
      },
    },

    // ============================================
    // SECCIONES EN PAPELERA
    // ============================================

    list_trashed_sections: {
      description: 'Lista secciones que están en la papelera.',
      parameters: listSectionsSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const sections = await api.sections.listTrashedSections(args.root_category_id, args.category_id, {
          from: args.from,
          limit: args.limit,
        });
        return toolResult(sections);
      },
    },
  };
}

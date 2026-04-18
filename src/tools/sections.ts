import type { ZohoDeskAPI } from '../client/index.js';
import {
  getSectionSchema,
  createSectionSchema,
  updateSectionSchema,
  moveSectionToTrashSchema,
} from '../utils/schemas.js';
import { resolveToken, resolveOrgId, toolResult } from './_helpers.js';

export function createSectionTools(api: ZohoDeskAPI) {

  return {
    // ============================================
    // CRUD BÁSICO
    // ============================================

    get_section: {
      description: 'Obtiene una seccion por su ID.',
      parameters: getSectionSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        const section = await api.sections.getSection(args.section_id);
        return toolResult(section);
      },
    },

    create_section: {
      description: 'Crea una nueva seccion dentro de una categoria.',
      parameters: createSectionSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        const section = await api.sections.createSection(args.category_id, {
          name: args.name,
          description: args.description,
          displayOrder: args.display_order,
          visibility: args.visibility,
        });
        return toolResult(section);
      },
    },

    update_section: {
      description: 'Actualiza una seccion existente.',
      parameters: updateSectionSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        const section = await api.sections.updateSection(args.section_id, {
          name: args.name,
          description: args.description,
          displayOrder: args.display_order,
          visibility: args.visibility,
        });
        return toolResult(section);
      },
    },

    // ============================================
    // PAPELERA
    // ============================================

    move_section_to_trash: {
      description: 'Mueve una seccion a la papelera.',
      parameters: moveSectionToTrashSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        await api.sections.moveSectionToTrash(args.section_id);
        return toolResult({ success: true, message: 'Section moved to trash' });
      },
    },
  };
}

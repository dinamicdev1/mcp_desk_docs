import type { ZohoDeskAPI } from '../client/index.js';
import { listDepartmentsSchema, baseSchema } from '../utils/schemas.js';
import { z } from 'zod';
import { resolveToken, resolveOrgId, toolResult } from './_helpers.js';

export function createDepartmentTools(api: ZohoDeskAPI) {

  return {
    list_departments: {
      description:
        'Lista todos los departamentos de Zoho Desk. Los departamentos pueden tener bases de conocimiento separadas.',
      parameters: listDepartmentsSchema,
      execute: async (args: {
        refresh_token: string;
        org_id?: string;
        from?: number;
        limit?: number;
      }) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        const departments = await api.departments.listDepartments(
          args.from || 0,
          args.limit || 50
        );

        return toolResult(departments);
      },
    },

    get_department: {
      description:
        'Obtiene los detalles de un departamento específico por su ID.',
      parameters: baseSchema.merge(
        z.object({
          department_id: z.string().describe('Department ID'),
        })
      ),
      execute: async (args: {
        refresh_token: string;
        org_id?: string;
        department_id: string;
      }) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        const department = await api.departments.getDepartment(args.department_id);

        return toolResult(department);
      },
    },
  };
}

import { z } from 'zod';
import type { ZohoDeskAPI } from '../client/index.js';
import { resolveToken, toolResult } from './_helpers.js';

export function createMetaTools(api: ZohoDeskAPI) {
  return {
    list_organizations: {
      description: 'Lista las organizaciones de Zoho Desk accesibles con el token actual. Util cuando hay multiples orgs y quieres saber cual usar como org_id.',
      parameters: z.object({
        refresh_token: z.string().optional().describe('Override opcional del refresh token. Si no se pasa, usa el persistido.'),
      }),
      execute: async (args: { refresh_token?: string }) => {
        await resolveToken(api, args.refresh_token);
        const orgs = await api.organizations.listOrganizations();
        return toolResult(orgs);
      },
    },
  };
}

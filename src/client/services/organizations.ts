import type { ZohoDeskClient } from '../zoho-client.js';
import type { ZohoDeskOrganization } from '../../types/index.js';

export class OrganizationsService {
  constructor(private _client: ZohoDeskClient) {}

  /**
   * Lista todas las organizaciones accesibles con el token actual.
   * Endpoint: GET /api/v1/organizations
   */
  async listOrganizations(): Promise<ZohoDeskOrganization[]> {
    const response = await this._client.getList<ZohoDeskOrganization>('/organizations');
    return response.data || [];
  }
}

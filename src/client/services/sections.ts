import type { ZohoDeskClient } from '../zoho-client.js';
import type {
  ZohoDeskSection,
  CreateSectionDTO,
  UpdateSectionDTO,
  SectionSearchParams,
} from '../../types/index.js';

export class SectionsService {
  constructor(private _client: ZohoDeskClient) {}

  /**
   * Lista secciones filtrando por category.
   * GET /api/v1/kbSections?categoryId={categoryId}
   */
  async listSections(
    categoryId: string,
    params: SectionSearchParams = {}
  ): Promise<ZohoDeskSection[]> {
    const queryParams: Record<string, any> = { categoryId };

    if (params.from !== undefined) queryParams.from = params.from;
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.isTrashed !== undefined) queryParams.isTrashed = params.isTrashed;

    const response = await this._client.getList<ZohoDeskSection>('/kbSections', queryParams);
    return response.data || [];
  }

  /**
   * Obtiene una seccion por su ID.
   * GET /api/v1/kbSections/{sectionId}
   */
  async getSection(sectionId: string): Promise<ZohoDeskSection> {
    return this._client.get<ZohoDeskSection>(`/kbSections/${sectionId}`);
  }

  /**
   * Crea una nueva seccion.
   * POST /api/v1/kbSections
   * Body: {categoryId, name, ...}
   */
  async createSection(categoryId: string, data: CreateSectionDTO): Promise<ZohoDeskSection> {
    const payload: Record<string, any> = {
      categoryId,
      name: data.name,
    };

    if (data.description) payload.description = data.description;
    if (data.displayOrder !== undefined) payload.displayOrder = data.displayOrder;
    if (data.visibility) payload.visibility = data.visibility;

    return this._client.post<ZohoDeskSection>('/kbSections', payload);
  }

  /**
   * Actualiza una seccion existente.
   * PATCH /api/v1/kbSections/{sectionId}
   */
  async updateSection(sectionId: string, data: UpdateSectionDTO): Promise<ZohoDeskSection> {
    const payload: Record<string, any> = {};

    if (data.name) payload.name = data.name;
    if (data.description) payload.description = data.description;
    if (data.displayOrder !== undefined) payload.displayOrder = data.displayOrder;
    if (data.visibility) payload.visibility = data.visibility;

    return this._client.patch<ZohoDeskSection>(`/kbSections/${sectionId}`, payload);
  }

  /**
   * Mueve una seccion a la papelera.
   * POST /api/v1/kbSections/{sectionId}/moveToTrash
   */
  async moveSectionToTrash(sectionId: string): Promise<void> {
    await this._client.post(`/kbSections/${sectionId}/moveToTrash`);
  }
}

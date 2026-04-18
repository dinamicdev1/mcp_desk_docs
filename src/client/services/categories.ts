import type { ZohoDeskClient } from '../zoho-client.js';
import type {
  CreateCategoryDTO,
  UpdateCategoryDTO,
  CategorySearchParams,
  ZohoDeskCategoryTree,
  ZohoDeskFolder,
} from '../../types/index.js';

export class CategoriesService {
  constructor(private _client: ZohoDeskClient) {}

  // ============================================
  // ROOT CATEGORIES (FOLDERS)
  // ============================================

  /**
   * Lista todas las categorías raíz (folders)
   * GET /api/v1/kbRootCategories
   */
  async listRootCategories(params: CategorySearchParams = {}): Promise<ZohoDeskFolder[]> {
    const queryParams: Record<string, any> = {};

    if (params.from !== undefined) queryParams.from = params.from;
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.departmentId) queryParams.departmentId = params.departmentId;

    const response = await this._client.getList<ZohoDeskFolder>('/kbRootCategories', queryParams);
    return response.data || [];
  }

  /**
   * Obtiene una categoría raíz por su ID
   * GET /api/v1/kbRootCategories/{rootCategoryId}
   */
  async getRootCategory(rootCategoryId: string): Promise<ZohoDeskFolder> {
    return this._client.get<ZohoDeskFolder>(`/kbRootCategories/${rootCategoryId}`);
  }

  /**
   * Crea una nueva categoría raíz
   * POST /api/v1/kbRootCategories
   */
  async createRootCategory(data: CreateCategoryDTO, departmentId?: string): Promise<ZohoDeskFolder> {
    const payload: Record<string, any> = {
      name: data.name,
    };

    if (data.description) payload.description = data.description;
    if (data.displayOrder !== undefined) payload.displayOrder = data.displayOrder;
    if (data.visibility) payload.visibility = data.visibility;
    if (departmentId) payload.departmentId = departmentId;

    return this._client.post<ZohoDeskFolder>('/kbRootCategories', payload);
  }

  /**
   * Actualiza una categoría raíz
   * PATCH /api/v1/kbRootCategories/{rootCategoryId}
   */
  async updateRootCategory(rootCategoryId: string, data: UpdateCategoryDTO): Promise<ZohoDeskFolder> {
    const payload: Record<string, any> = {};

    if (data.name) payload.name = data.name;
    if (data.description) payload.description = data.description;
    if (data.displayOrder !== undefined) payload.displayOrder = data.displayOrder;
    if (data.visibility) payload.visibility = data.visibility;

    return this._client.patch<ZohoDeskFolder>(`/kbRootCategories/${rootCategoryId}`, payload);
  }

  /**
   * Mueve categoría raíz a la papelera
   * POST /api/v1/kbRootCategories/{rootCategoryId}/moveToTrash
   */
  async moveRootCategoryToTrash(rootCategoryId: string): Promise<void> {
    await this._client.post(`/kbRootCategories/${rootCategoryId}/moveToTrash`);
  }

  // ============================================
  // CATEGORY TREE
  // ============================================

  /**
   * Obtiene el arbol de una categoria raiz (con secciones y subcategorias)
   * GET /api/v1/kbRootCategories/{rootCategoryId}/categoryTree
   */
  async getCategoryTree(rootCategoryId: string): Promise<ZohoDeskCategoryTree> {
    return this._client.get<ZohoDeskCategoryTree>(`/kbRootCategories/${rootCategoryId}/categoryTree`);
  }
}

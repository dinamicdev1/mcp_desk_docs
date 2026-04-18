import type { ZohoDeskClient } from '../zoho-client.js';
import type {
  ZohoDeskCategory,
  CreateCategoryDTO,
  UpdateCategoryDTO,
  CategorySearchParams,
  ZohoDeskCategoryTree,
  CategoryPermission,
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
   * GET /api/v1/kbRootCategories/{categoryId}
   */
  async getRootCategory(categoryId: string): Promise<ZohoDeskFolder> {
    return this._client.get<ZohoDeskFolder>(`/kbRootCategories/${categoryId}`);
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
   * PATCH /api/v1/kbRootCategories/{categoryId}
   */
  async updateRootCategory(categoryId: string, data: UpdateCategoryDTO): Promise<ZohoDeskFolder> {
    const payload: Record<string, any> = {};

    if (data.name) payload.name = data.name;
    if (data.description) payload.description = data.description;
    if (data.displayOrder !== undefined) payload.displayOrder = data.displayOrder;
    if (data.visibility) payload.visibility = data.visibility;

    return this._client.patch<ZohoDeskFolder>(`/kbRootCategories/${categoryId}`, payload);
  }

  /**
   * Mueve categoría raíz a la papelera
   * POST /api/v1/kbRootCategories/{categoryId}/moveToTrash
   */
  async moveRootCategoryToTrash(categoryId: string): Promise<void> {
    await this._client.post(`/kbRootCategories/${categoryId}/moveToTrash`);
  }

  // ============================================
  // CHILD CATEGORIES (dentro de root categories)
  // ============================================

  /**
   * Lista categorías hijas de una categoría raíz
   * GET /api/v1/kbCategories/{rootCategoryId}/categories
   */
  async listCategories(rootCategoryId: string, params: CategorySearchParams = {}): Promise<ZohoDeskCategory[]> {
    const queryParams: Record<string, any> = {};

    if (params.from !== undefined) queryParams.from = params.from;
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.isTrashed !== undefined) queryParams.isTrashed = params.isTrashed;

    const response = await this._client.getList<ZohoDeskCategory>(`/kbCategories/${rootCategoryId}/categories`, queryParams);
    return response.data || [];
  }

  /**
   * Obtiene una categoría por su ID
   * GET /api/v1/kbCategories/{rootCategoryId}/categories/{categoryId}
   */
  async getCategory(rootCategoryId: string, categoryId: string): Promise<ZohoDeskCategory> {
    return this._client.get<ZohoDeskCategory>(`/kbCategories/${rootCategoryId}/categories/${categoryId}`);
  }

  /**
   * Crea una nueva categoría dentro de una raíz
   * POST /api/v1/kbCategories/{rootCategoryId}/categories
   */
  async createCategory(rootCategoryId: string, data: CreateCategoryDTO): Promise<ZohoDeskCategory> {
    const payload: Record<string, any> = {
      name: data.name,
    };

    if (data.description) payload.description = data.description;
    if (data.displayOrder !== undefined) payload.displayOrder = data.displayOrder;
    if (data.visibility) payload.visibility = data.visibility;

    return this._client.post<ZohoDeskCategory>(`/kbCategories/${rootCategoryId}/categories`, payload);
  }

  /**
   * Actualiza una categoría
   * PATCH /api/v1/kbCategories/{rootCategoryId}/categories/{categoryId}
   */
  async updateCategory(rootCategoryId: string, categoryId: string, data: UpdateCategoryDTO): Promise<ZohoDeskCategory> {
    const payload: Record<string, any> = {};

    if (data.name) payload.name = data.name;
    if (data.description) payload.description = data.description;
    if (data.displayOrder !== undefined) payload.displayOrder = data.displayOrder;
    if (data.visibility) payload.visibility = data.visibility;

    return this._client.patch<ZohoDeskCategory>(`/kbCategories/${rootCategoryId}/categories/${categoryId}`, payload);
  }

  /**
   * Mueve categoría a la papelera
   * POST /api/v1/kbCategories/{rootCategoryId}/categories/{categoryId}/moveToTrash
   */
  async moveCategoryToTrash(rootCategoryId: string, categoryId: string): Promise<void> {
    await this._client.post(`/kbCategories/${rootCategoryId}/categories/${categoryId}/moveToTrash`);
  }

  /**
   * Restaura categoría de la papelera
   * POST /api/v1/kbCategories/{rootCategoryId}/categories/{categoryId}/restore
   */
  async restoreCategory(rootCategoryId: string, categoryId: string): Promise<void> {
    await this._client.post(`/kbCategories/${rootCategoryId}/categories/${categoryId}/restore`);
  }

  /**
   * Elimina permanentemente una categoría
   * DELETE /api/v1/kbCategories/{rootCategoryId}/categories/{categoryId}
   */
  async deleteCategory(rootCategoryId: string, categoryId: string): Promise<void> {
    await this._client.delete(`/kbCategories/${rootCategoryId}/categories/${categoryId}`);
  }

  // ============================================
  // LEGACY ENDPOINTS (para compatibilidad)
  // ============================================

  /**
   * Lista todas las categorías (legacy endpoint)
   * GET /api/v1/categories
   */
  async listAllCategories(params: CategorySearchParams = {}): Promise<ZohoDeskCategory[]> {
    const queryParams: Record<string, any> = {};

    if (params.from !== undefined) queryParams.from = params.from;
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.departmentId) queryParams.departmentId = params.departmentId;

    const response = await this._client.getList<ZohoDeskCategory>('/categories', queryParams);
    return response.data || [];
  }

  /**
   * Obtiene el árbol de una categoría (con secciones y subcategorías)
   * GET /api/v1/categories/{categoryId}/tree
   */
  async getCategoryTree(categoryId: string): Promise<ZohoDeskCategoryTree> {
    return this._client.get<ZohoDeskCategoryTree>(`/categories/${categoryId}/tree`);
  }

  // ============================================
  // PERMISOS DE CATEGORÍA
  // ============================================

  /**
   * Lista permisos de usuarios en una categoría
   * GET /api/v1/kbCategories/{rootCategoryId}/categories/{categoryId}/userPermissions
   */
  async listCategoryPermissions(rootCategoryId: string, categoryId: string): Promise<CategoryPermission[]> {
    const response = await this._client.getList<CategoryPermission>(
      `/kbCategories/${rootCategoryId}/categories/${categoryId}/userPermissions`
    );
    return response.data || [];
  }

  /**
   * Actualiza permisos de usuarios en una categoría
   * PATCH /api/v1/kbCategories/{rootCategoryId}/categories/{categoryId}/userPermissions
   */
  async updateCategoryPermissions(
    rootCategoryId: string,
    categoryId: string,
    permissions: CategoryPermission[]
  ): Promise<void> {
    await this._client.patch(`/kbCategories/${rootCategoryId}/categories/${categoryId}/userPermissions`, {
      userPermissions: permissions,
    });
  }

  // ============================================
  // CATEGORÍAS EN PAPELERA
  // ============================================

  /**
   * Lista categorías en la papelera
   * GET /api/v1/kbCategories/{rootCategoryId}/categories?isTrashed=true
   */
  async listTrashedCategories(rootCategoryId: string, params: { from?: number; limit?: number } = {}): Promise<ZohoDeskCategory[]> {
    return this.listCategories(rootCategoryId, { ...params, isTrashed: true });
  }
}

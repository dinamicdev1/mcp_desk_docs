import type { ZohoDeskClient } from '../zoho-client.js';
import type {
  ZohoDeskArticle,
  CreateArticleDTO,
  UpdateArticleDTO,
  ArticleSearchParams,
  ZohoDeskTranslation,
  CreateTranslationDTO,
  UpdateTranslationDTO,
  ZohoDeskAttachment,
  ZohoDeskArticleVersion,
  RelatedArticle,
  PermalinkCheckResponse,
  MyArticlesResponse,
} from '../../types/index.js';

export class ArticlesService {
  constructor(private _client: ZohoDeskClient) {}

  /**
   * Lista artículos de la base de conocimientos
   * GET /api/v1/articles
   */
  async listArticles(params: ArticleSearchParams = {}): Promise<ZohoDeskArticle[]> {
    const queryParams: Record<string, any> = {};

    if (params.from !== undefined) queryParams.from = params.from;
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.categoryId) queryParams.categoryId = params.categoryId;
    if (params.sectionId) queryParams.sectionId = params.sectionId;
    if (params.status) queryParams.status = params.status;
    if (params.sortBy) queryParams.sortBy = params.sortBy;
    if (params.orderBy) queryParams.orderBy = params.orderBy;
    if (params.isTrashed !== undefined) queryParams.isTrashed = params.isTrashed;
    if (params.ownerId) queryParams.ownerId = params.ownerId;
    if (params.departmentId) queryParams.departmentId = params.departmentId;

    const response = await this._client.getList<ZohoDeskArticle>('/articles', queryParams);
    return response.data || [];
  }

  /**
   * Obtiene un artículo por su ID
   * GET /api/v1/articles/{articleId}
   */
  async getArticle(articleId: string): Promise<ZohoDeskArticle> {
    return this._client.get<ZohoDeskArticle>(`/articles/${articleId}`);
  }

  /**
   * Busca artículos por texto (usando el endpoint de búsqueda de KB)
   * GET /api/v1/articles/search
   */
  async searchArticles(searchStr: string, params: ArticleSearchParams = {}): Promise<ZohoDeskArticle[]> {
    const queryParams: Record<string, any> = {
      searchStr,
    };

    if (params.from !== undefined) queryParams.from = params.from;
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.categoryId) queryParams.categoryId = params.categoryId;
    if (params.departmentId) queryParams.departmentId = params.departmentId;
    if (params.status) queryParams.status = params.status;

    const response = await this._client.getList<ZohoDeskArticle>('/articles/search', queryParams);
    return response.data || [];
  }

  /**
   * Crea un nuevo artículo
   * POST /api/v1/articles
   */
  async createArticle(data: CreateArticleDTO): Promise<ZohoDeskArticle> {
    const payload: Record<string, any> = {
      title: data.title,
      answer: data.answer,
      categoryId: data.categoryId,
    };

    if (data.sectionId) payload.sectionId = data.sectionId;
    if (data.status) payload.status = data.status;
    if (data.visibility) payload.visibility = data.visibility;
    if (data.authorId) payload.authorId = data.authorId;
    if (data.ownerId) payload.ownerId = data.ownerId;
    if (data.expiryDate) payload.expiryDate = data.expiryDate;
    if (data.reviewDate) payload.reviewDate = data.reviewDate;
    if (data.summary) payload.summary = data.summary;
    if (data.seoTitle) payload.seoTitle = data.seoTitle;
    if (data.seoDescription) payload.seoDescription = data.seoDescription;
    if (data.seoKeywords) payload.seoKeywords = data.seoKeywords;
    if (data.tags) payload.tags = data.tags;
    if (data.permalink) payload.permalink = data.permalink;
    if (data.disableComments !== undefined) payload.disableComments = data.disableComments;

    return this._client.post<ZohoDeskArticle>('/articles', payload);
  }

  /**
   * Actualiza un artículo existente
   * PATCH /api/v1/articles/{articleId}
   */
  async updateArticle(articleId: string, data: UpdateArticleDTO): Promise<ZohoDeskArticle> {
    const payload: Record<string, any> = {};

    if (data.title) payload.title = data.title;
    if (data.answer) payload.answer = data.answer;
    if (data.categoryId) payload.categoryId = data.categoryId;
    if (data.sectionId) payload.sectionId = data.sectionId;
    if (data.status) payload.status = data.status;
    if (data.visibility) payload.visibility = data.visibility;
    if (data.ownerId) payload.ownerId = data.ownerId;
    if (data.expiryDate) payload.expiryDate = data.expiryDate;
    if (data.reviewDate) payload.reviewDate = data.reviewDate;
    if (data.summary) payload.summary = data.summary;
    if (data.seoTitle) payload.seoTitle = data.seoTitle;
    if (data.seoDescription) payload.seoDescription = data.seoDescription;
    if (data.seoKeywords) payload.seoKeywords = data.seoKeywords;
    if (data.tags) payload.tags = data.tags;
    if (data.permalink) payload.permalink = data.permalink;
    if (data.disableComments !== undefined) payload.disableComments = data.disableComments;

    return this._client.patch<ZohoDeskArticle>(`/articles/${articleId}`, payload);
  }

  /**
   * Mueve artículos a la papelera
   * POST /api/v1/articles/moveToTrash
   */
  async moveToTrash(articleIds: string[]): Promise<void> {
    await this._client.post('/articles/moveToTrash', { articleIds });
  }

  /**
   * Restaura articulos de la papelera.
   * POST /api/v1/recycleBin/restore
   * Body: {ids: [...]}
   */
  async restoreFromTrash(articleIds: string[]): Promise<void> {
    await this._client.post('/recycleBin/restore', { ids: articleIds });
  }

  /**
   * Elimina articulos permanentemente (solo si estan en papelera).
   * POST /api/v1/recycleBin/delete
   * Body: {ids: [...]}
   */
  async deleteArticles(articleIds: string[]): Promise<void> {
    await this._client.post('/recycleBin/delete', { ids: articleIds });
  }

  /**
   * Verifica disponibilidad de permalink.
   * POST /api/v1/articles/checkPermalinkAvailability
   */
  async checkPermalink(permalink: string, articleId?: string): Promise<PermalinkCheckResponse> {
    const payload: Record<string, any> = { permalink };
    if (articleId) payload.articleId = articleId;

    return this._client.post<PermalinkCheckResponse>('/articles/checkPermalinkAvailability', payload);
  }

  /**
   * Lista artículos en la papelera
   * GET /api/v1/articles con isTrashed=true
   */
  async listTrashedArticles(params: { from?: number; limit?: number } = {}): Promise<ZohoDeskArticle[]> {
    return this.listArticles({ ...params, isTrashed: true });
  }

  // ============================================
  // VERSIONES
  // ============================================

  /**
   * Lista entradas del historial de un articulo.
   * GET /api/v1/articles/{articleId}/history
   */
  async listArticleHistory(articleId: string): Promise<ZohoDeskArticleVersion[]> {
    const response = await this._client.getList<ZohoDeskArticleVersion>(`/articles/${articleId}/history`);
    return response.data || [];
  }

  /**
   * Obtiene una entrada especifica del historial.
   * GET /api/v1/articles/{articleId}/history/{entryId}
   */
  async getHistoryEntry(articleId: string, entryId: string): Promise<ZohoDeskArticleVersion> {
    return this._client.get<ZohoDeskArticleVersion>(`/articles/${articleId}/history/${entryId}`);
  }

  // ============================================
  // TRADUCCIONES
  // ============================================

  /**
   * Lista las traducciones de un artículo
   * GET /api/v1/articles/{articleId}/translations
   */
  async listTranslations(articleId: string): Promise<ZohoDeskTranslation[]> {
    const response = await this._client.getList<ZohoDeskTranslation>(`/articles/${articleId}/translations`);
    return response.data || [];
  }

  /**
   * Obtiene una traduccion por su locale.
   * GET /api/v1/articles/{articleId}/translations/{locale}
   */
  async getTranslation(articleId: string, locale: string): Promise<ZohoDeskTranslation> {
    return this._client.get<ZohoDeskTranslation>(`/articles/${articleId}/translations/${locale}`);
  }

  /**
   * Crea una traducción para un artículo
   * POST /api/v1/articles/{articleId}/translations
   */
  async createTranslation(articleId: string, data: CreateTranslationDTO): Promise<ZohoDeskTranslation> {
    const payload: Record<string, any> = {
      locale: data.locale,
      title: data.title,
      answer: data.answer,
    };

    if (data.status) payload.status = data.status;

    return this._client.post<ZohoDeskTranslation>(`/articles/${articleId}/translations`, payload);
  }

  /**
   * Actualiza una traduccion identificada por locale.
   * PATCH /api/v1/articles/{articleId}/translations/{locale}
   */
  async updateTranslation(articleId: string, locale: string, data: UpdateTranslationDTO): Promise<ZohoDeskTranslation> {
    const payload: Record<string, any> = {};

    if (data.title) payload.title = data.title;
    if (data.answer) payload.answer = data.answer;
    if (data.status) payload.status = data.status;

    return this._client.patch<ZohoDeskTranslation>(`/articles/${articleId}/translations/${locale}`, payload);
  }

  /**
   * Mueve una traduccion a la papelera.
   * POST /api/v1/articles/{articleId}/translations/{locale}/moveToTrash
   */
  async moveTranslationToTrash(articleId: string, locale: string): Promise<void> {
    await this._client.post(`/articles/${articleId}/translations/${locale}/moveToTrash`);
  }

  // ============================================
  // ADJUNTOS
  // ============================================

  /**
   * Lista los adjuntos de un artículo
   * GET /api/v1/articles/{articleId}/attachments
   */
  async listAttachments(articleId: string): Promise<ZohoDeskAttachment[]> {
    const response = await this._client.getList<ZohoDeskAttachment>(`/articles/${articleId}/attachments`);
    return response.data || [];
  }

  /**
   * Elimina un adjunto
   * DELETE /api/v1/articles/{articleId}/attachments/{attachmentId}
   */
  async deleteAttachment(articleId: string, attachmentId: string): Promise<void> {
    await this._client.delete(`/articles/${articleId}/attachments/${attachmentId}`);
  }

  // ============================================
  // ARTÍCULOS RELACIONADOS
  // ============================================

  /**
   * Lista artículos relacionados
   * GET /api/v1/articles/{articleId}/relatedArticles
   */
  async listRelatedArticles(articleId: string): Promise<RelatedArticle[]> {
    const response = await this._client.getList<RelatedArticle>(`/articles/${articleId}/relatedArticles`);
    return response.data || [];
  }

  /**
   * Asocia artículos relacionados
   * POST /api/v1/articles/{articleId}/relatedArticles
   */
  async addRelatedArticles(articleId: string, relatedArticleIds: string[]): Promise<void> {
    await this._client.post(`/articles/${articleId}/relatedArticles`, {
      relatedArticleIds,
    });
  }

  /**
   * Elimina un artículo relacionado
   * DELETE /api/v1/articles/{articleId}/relatedArticles/{relatedArticleId}
   */
  async removeRelatedArticle(articleId: string, relatedArticleId: string): Promise<void> {
    await this._client.delete(`/articles/${articleId}/relatedArticles/${relatedArticleId}`);
  }

  // ============================================
  // TAGS
  // ============================================

  /**
   * Lista tags de un artículo
   * GET /api/v1/articles/{articleId}/tags
   */
  async listTags(articleId: string): Promise<string[]> {
    const response = await this._client.get<{ tags: string[] }>(`/articles/${articleId}/tags`);
    return response.tags || [];
  }

  /**
   * Actualiza tags de un artículo
   * POST /api/v1/articles/{articleId}/tags
   */
  async updateTags(articleId: string, tags: string[]): Promise<void> {
    await this._client.post(`/articles/${articleId}/tags`, { tags });
  }

  // ============================================
  // CONTADORES Y FEEDBACK
  // ============================================

  /**
   * Incrementa el contador de vistas
   * POST /api/v1/articles/{articleId}/markAsViewed
   */
  async markAsViewed(articleId: string): Promise<void> {
    await this._client.post(`/articles/${articleId}/markAsViewed`);
  }

  /**
   * Registra like en un artículo
   * POST /api/v1/articles/{articleId}/like
   */
  async likeArticle(articleId: string): Promise<void> {
    await this._client.post(`/articles/${articleId}/like`);
  }

  /**
   * Registra dislike en un artículo
   * POST /api/v1/articles/{articleId}/dislike
   */
  async dislikeArticle(articleId: string): Promise<void> {
    await this._client.post(`/articles/${articleId}/dislike`);
  }

  /**
   * Marca artículo como usado (para tickets)
   * POST /api/v1/articles/{articleId}/markAsUsed
   */
  async markAsUsed(articleId: string, ticketId?: string): Promise<void> {
    const payload: Record<string, any> = {};
    if (ticketId) payload.ticketId = ticketId;
    await this._client.post(`/articles/${articleId}/markAsUsed`, payload);
  }
}

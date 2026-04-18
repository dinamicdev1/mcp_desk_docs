import { z } from 'zod';

// Base schema con refresh_token y org_id opcionales (resueltos via resolveToken/resolveOrgId)
export const baseSchema = z.object({
  refresh_token: z.string().optional().describe('Override opcional del refresh token. Si no se pasa, se resuelve desde memoria del client o secure-storage.'),
  org_id: z.string().optional().describe('Override opcional del Organization ID. Si no se pasa, se resuelve desde memoria, secure-storage o auto-deteccion.'),
});

// Visibilidad común
const visibilityEnum = z.enum(['Agents', 'All', 'Logged in Users', 'Custom access']);

// Estados de artículo
const articleStatusEnum = z.enum(['Draft', 'In Review', 'Approved', 'Published', 'Unpublished']);
const articleStatusCreateEnum = z.enum(['Draft', 'In Review', 'Approved', 'Published']);

// ============================================
// ARTICLE SCHEMAS
// ============================================

export const listArticlesSchema = baseSchema.merge(
  z.object({
    from: z.number().min(1).default(1).describe('Starting index for pagination (min: 1)'),
    limit: z.number().default(50).describe('Number of articles to retrieve (max 100)'),
    category_id: z.string().optional().describe('Filter by category ID'),
    section_id: z.string().optional().describe('Filter by section ID'),
    status: articleStatusEnum.optional().describe('Filter by article status'),
    sort_by: z.enum(['createdTime', 'modifiedTime', 'position', 'viewCount', 'likeCount', 'mostUsed', 'recentlyUsed']).optional().describe('Sort field'),
    order_by: z.enum(['asc', 'desc']).optional().describe('Sort order'),
    owner_id: z.string().optional().describe('Filter by owner ID'),
    department_id: z.string().optional().describe('Filter by department ID'),
  })
);

export const getArticleSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
  })
);

export const searchArticlesSchema = baseSchema.merge(
  z.object({
    search_str: z.string().describe('Search query string'),
    from: z.number().min(1).default(1).describe('Starting index for pagination (min: 1)'),
    limit: z.number().default(50).describe('Number of articles to retrieve (max 100)'),
    category_id: z.string().optional().describe('Filter by category ID'),
    department_id: z.string().optional().describe('Filter by department ID'),
    status: articleStatusEnum.optional().describe('Filter by article status'),
  })
);

export const createArticleSchema = baseSchema.merge(
  z.object({
    title: z.string().describe('Article title'),
    answer: z.string().describe('Article content/answer (HTML supported)'),
    category_id: z.string().describe('Category ID where the article will be created'),
    section_id: z.string().optional().describe('Section ID within the category'),
    status: articleStatusCreateEnum.optional().default('Draft').describe('Article status'),
    visibility: visibilityEnum.optional().default('All').describe('Article visibility'),
    author_id: z.string().optional().describe('Author user ID'),
    owner_id: z.string().optional().describe('Owner user ID'),
    expiry_date: z.string().optional().describe('Expiry date (ISO format)'),
    review_date: z.string().optional().describe('Review date (ISO format)'),
    summary: z.string().optional().describe('Article summary'),
    seo_title: z.string().optional().describe('SEO title'),
    seo_description: z.string().optional().describe('SEO description'),
    seo_keywords: z.string().optional().describe('SEO keywords'),
    tags: z.array(z.string()).optional().describe('Tags for the article'),
    permalink: z.string().optional().describe('Custom permalink/slug'),
    disable_comments: z.boolean().optional().describe('Disable comments on article'),
  })
);

export const updateArticleSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID to update'),
    title: z.string().optional().describe('Article title'),
    answer: z.string().optional().describe('Article content/answer (HTML supported)'),
    category_id: z.string().optional().describe('Category ID to move the article to'),
    section_id: z.string().optional().describe('Section ID within the category'),
    status: articleStatusCreateEnum.optional().describe('Article status'),
    visibility: visibilityEnum.optional().describe('Article visibility'),
    owner_id: z.string().optional().describe('Owner user ID'),
    expiry_date: z.string().optional().describe('Expiry date (ISO format)'),
    review_date: z.string().optional().describe('Review date (ISO format)'),
    summary: z.string().optional().describe('Article summary'),
    seo_title: z.string().optional().describe('SEO title'),
    seo_description: z.string().optional().describe('SEO description'),
    seo_keywords: z.string().optional().describe('SEO keywords'),
    tags: z.array(z.string()).optional().describe('Tags for the article'),
    permalink: z.string().optional().describe('Custom permalink/slug'),
    disable_comments: z.boolean().optional().describe('Disable comments on article'),
  })
);

export const moveToTrashSchema = baseSchema.merge(
  z.object({
    article_ids: z.array(z.string()).describe('Array of article IDs to move to trash'),
  })
);

export const restoreFromTrashSchema = baseSchema.merge(
  z.object({
    article_ids: z.array(z.string()).describe('Array of article IDs to restore from trash'),
  })
);

export const deleteArticlesSchema = baseSchema.merge(
  z.object({
    article_ids: z.array(z.string()).describe('Array of article IDs to permanently delete'),
  })
);

export const checkPermalinkSchema = baseSchema.merge(
  z.object({
    permalink: z.string().describe('Permalink to check availability'),
    article_id: z.string().optional().describe('Article ID to exclude from check (for updates)'),
  })
);

export const listTrashedArticlesSchema = baseSchema.merge(
  z.object({
    from: z.number().min(1).default(1).describe('Starting index for pagination (min: 1)'),
    limit: z.number().default(50).describe('Number of articles to retrieve'),
  })
);

// ============================================
// HISTORY SCHEMAS
// ============================================

export const listArticleHistorySchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
  })
);

export const getHistoryEntrySchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
    entry_id: z.string().describe('History entry ID'),
  })
);

// ============================================
// TRANSLATION SCHEMAS
// ============================================

export const listTranslationsSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
  })
);

export const getTranslationSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
    locale: z.string().describe('Locale code (e.g. "en", "en-us", "es")'),
  })
);

export const createTranslationSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
    locale: z.string().describe('Locale code'),
    title: z.string().describe('Translation title'),
    answer: z.string().describe('Translation content (HTML supported)'),
    status: z.enum(['Draft', 'In Review', 'Approved', 'Published']).optional().describe('Translation status'),
  })
);

export const updateTranslationSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
    locale: z.string().describe('Locale code'),
    title: z.string().optional().describe('Translation title'),
    answer: z.string().optional().describe('Translation content'),
    status: z.enum(['Draft', 'In Review', 'Approved', 'Published']).optional(),
  })
);

export const moveTranslationToTrashSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
    locale: z.string().describe('Locale code'),
  })
);

// ============================================
// ATTACHMENT SCHEMAS
// ============================================

export const listTranslationAttachmentsSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
    locale: z.string().describe('Locale code (e.g. "en")'),
  })
);

export const dissociateAttachmentsSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
    locale: z.string().describe('Locale code'),
    attachment_ids: z.array(z.string()).min(1).describe('Array of attachment IDs to dissociate'),
  })
);

// ============================================
// FEEDBACK SCHEMAS
// ============================================

export const articleFeedbackSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
    locale: z.string().describe('Locale code of the translation to like/dislike'),
  })
);

// ============================================
// ROOT CATEGORY (FOLDER) SCHEMAS
// ============================================

export const listRootCategoriesSchema = baseSchema.merge(
  z.object({
    from: z.number().min(1).default(1).describe('Starting index for pagination (min: 1)'),
    limit: z.number().default(50).describe('Number of categories to retrieve'),
    department_id: z.string().optional().describe('Filter by department ID'),
  })
);

export const getRootCategorySchema = baseSchema.merge(
  z.object({
    category_id: z.string().describe('Root category ID'),
  })
);

export const createRootCategorySchema = baseSchema.merge(
  z.object({
    name: z.string().describe('Category name'),
    description: z.string().optional().describe('Category description'),
    display_order: z.number().optional().describe('Display order/position'),
    visibility: visibilityEnum.optional().describe('Category visibility'),
    department_id: z.string().optional().describe('Department ID to associate'),
  })
);

export const updateRootCategorySchema = baseSchema.merge(
  z.object({
    category_id: z.string().describe('Root category ID to update'),
    name: z.string().optional().describe('Category name'),
    description: z.string().optional().describe('Category description'),
    display_order: z.number().optional().describe('Display order/position'),
    visibility: visibilityEnum.optional().describe('Category visibility'),
  })
);

export const deleteRootCategorySchema = baseSchema.merge(
  z.object({
    category_id: z.string().describe('Root category ID to delete'),
  })
);

export const getCategoryTreeSchema = baseSchema.merge(
  z.object({
    root_category_id: z.string().describe('Root category ID to retrieve the tree for'),
  })
);

// ============================================
// SECTION SCHEMAS
// ============================================

export const listSectionsSchema = baseSchema.merge(
  z.object({
    category_id: z.string().describe('Category ID to list sections for'),
    from: z.number().min(1).default(1).describe('Starting index for pagination (min: 1)'),
    limit: z.number().default(50).describe('Number of sections to retrieve'),
    is_trashed: z.boolean().optional().describe('Filter by trashed state'),
  })
);

export const getSectionSchema = baseSchema.merge(
  z.object({
    section_id: z.string().describe('Section ID'),
  })
);

export const createSectionSchema = baseSchema.merge(
  z.object({
    category_id: z.string().describe('Parent category ID'),
    name: z.string().describe('Section name'),
    description: z.string().optional().describe('Section description'),
    display_order: z.number().optional().describe('Display order'),
    visibility: z.enum(['Agents', 'All', 'Logged in Users', 'Custom access']).optional(),
  })
);

export const updateSectionSchema = baseSchema.merge(
  z.object({
    section_id: z.string().describe('Section ID'),
    name: z.string().optional(),
    description: z.string().optional(),
    display_order: z.number().optional(),
    visibility: z.enum(['Agents', 'All', 'Logged in Users', 'Custom access']).optional(),
  })
);

export const moveSectionToTrashSchema = baseSchema.merge(
  z.object({
    section_id: z.string().describe('Section ID'),
  })
);

// ============================================
// DEPARTMENT SCHEMAS
// ============================================

export const listDepartmentsSchema = baseSchema.merge(
  z.object({
    from: z.number().min(1).default(1).describe('Starting index for pagination (min: 1)'),
    limit: z.number().default(50).describe('Number of departments to retrieve'),
  })
);

export const getDepartmentSchema = baseSchema.merge(
  z.object({
    department_id: z.string().describe('Department ID'),
  })
);

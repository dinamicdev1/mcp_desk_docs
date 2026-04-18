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
    from: z.number().default(0).describe('Starting index for pagination'),
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
    from: z.number().default(0).describe('Starting index for pagination'),
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

export const moveArticlesSchema = baseSchema.merge(
  z.object({
    article_ids: z.array(z.string()).describe('Array of article IDs to move'),
    category_id: z.string().describe('Target category ID'),
    section_id: z.string().optional().describe('Target section ID (optional)'),
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
    from: z.number().default(0).describe('Starting index for pagination'),
    limit: z.number().default(50).describe('Number of articles to retrieve'),
  })
);

// ============================================
// VERSION SCHEMAS
// ============================================

export const listVersionsSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID to list versions for'),
  })
);

export const getVersionSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
    version: z.number().describe('Version number'),
  })
);

// ============================================
// TRANSLATION SCHEMAS
// ============================================

export const listTranslationsSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID to list translations for'),
  })
);

export const createTranslationSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID to add translation to'),
    locale: z.string().describe('Locale code (e.g., es, fr, de)'),
    title: z.string().describe('Translated title'),
    answer: z.string().describe('Translated content/answer'),
    status: articleStatusCreateEnum.optional().default('Draft').describe('Translation status'),
  })
);

export const updateTranslationSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
    translation_id: z.string().describe('Translation ID to update'),
    title: z.string().optional().describe('Translated title'),
    answer: z.string().optional().describe('Translated content/answer'),
    status: articleStatusCreateEnum.optional().describe('Translation status'),
  })
);

export const deleteTranslationSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
    translation_id: z.string().describe('Translation ID to delete'),
  })
);

// ============================================
// ATTACHMENT SCHEMAS
// ============================================

export const listAttachmentsSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID to list attachments for'),
  })
);

export const deleteAttachmentSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
    attachment_id: z.string().describe('Attachment ID to delete'),
  })
);

// ============================================
// RELATED ARTICLES SCHEMAS
// ============================================

export const listRelatedArticlesSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID to list related articles for'),
  })
);

export const addRelatedArticlesSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
    related_article_ids: z.array(z.string()).describe('Array of article IDs to add as related'),
  })
);

export const removeRelatedArticleSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
    related_article_id: z.string().describe('Related article ID to remove'),
  })
);

// ============================================
// FEEDBACK SCHEMAS
// ============================================

export const articleFeedbackSchema = baseSchema.merge(
  z.object({
    article_id: z.string().describe('Article ID'),
  })
);

// ============================================
// ROOT CATEGORY (FOLDER) SCHEMAS
// ============================================

export const listRootCategoriesSchema = baseSchema.merge(
  z.object({
    from: z.number().default(0).describe('Starting index for pagination'),
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

// ============================================
// CHILD CATEGORY SCHEMAS
// ============================================

export const listCategoriesSchema = baseSchema.merge(
  z.object({
    root_category_id: z.string().describe('Root category ID'),
    from: z.number().default(0).describe('Starting index for pagination'),
    limit: z.number().default(50).describe('Number of categories to retrieve'),
  })
);

export const getCategorySchema = baseSchema.merge(
  z.object({
    root_category_id: z.string().describe('Root category ID'),
    category_id: z.string().describe('Category ID'),
  })
);

export const getCategoryTreeSchema = baseSchema.merge(
  z.object({
    category_id: z.string().describe('Category ID to get the tree for'),
  })
);

export const createCategorySchema = baseSchema.merge(
  z.object({
    root_category_id: z.string().describe('Root category ID'),
    name: z.string().describe('Category name'),
    description: z.string().optional().describe('Category description'),
    display_order: z.number().optional().describe('Display order/position'),
    visibility: visibilityEnum.optional().describe('Category visibility'),
  })
);

export const updateCategorySchema = baseSchema.merge(
  z.object({
    root_category_id: z.string().describe('Root category ID'),
    category_id: z.string().describe('Category ID to update'),
    name: z.string().optional().describe('Category name'),
    description: z.string().optional().describe('Category description'),
    display_order: z.number().optional().describe('Display order/position'),
    visibility: visibilityEnum.optional().describe('Category visibility'),
  })
);

export const deleteCategorySchema = baseSchema.merge(
  z.object({
    root_category_id: z.string().describe('Root category ID'),
    category_id: z.string().describe('Category ID to delete'),
  })
);

// ============================================
// SECTION SCHEMAS
// ============================================

export const listSectionsSchema = baseSchema.merge(
  z.object({
    root_category_id: z.string().describe('Root category ID'),
    category_id: z.string().describe('Category ID to list sections for'),
    from: z.number().default(0).describe('Starting index for pagination'),
    limit: z.number().default(50).describe('Number of sections to retrieve'),
  })
);

export const getSectionSchema = baseSchema.merge(
  z.object({
    root_category_id: z.string().describe('Root category ID'),
    category_id: z.string().describe('Category ID'),
    section_id: z.string().describe('Section ID'),
  })
);

export const createSectionSchema = baseSchema.merge(
  z.object({
    root_category_id: z.string().describe('Root category ID'),
    category_id: z.string().describe('Category ID where the section will be created'),
    name: z.string().describe('Section name'),
    description: z.string().optional().describe('Section description'),
    display_order: z.number().optional().describe('Display order/position'),
    visibility: visibilityEnum.optional().describe('Section visibility'),
  })
);

export const updateSectionSchema = baseSchema.merge(
  z.object({
    root_category_id: z.string().describe('Root category ID'),
    category_id: z.string().describe('Category ID'),
    section_id: z.string().describe('Section ID to update'),
    name: z.string().optional().describe('Section name'),
    description: z.string().optional().describe('Section description'),
    display_order: z.number().optional().describe('Display order/position'),
    visibility: visibilityEnum.optional().describe('Section visibility'),
  })
);

export const deleteSectionSchema = baseSchema.merge(
  z.object({
    root_category_id: z.string().describe('Root category ID'),
    category_id: z.string().describe('Category ID'),
    section_id: z.string().describe('Section ID to delete'),
  })
);

// ============================================
// DEPARTMENT SCHEMAS
// ============================================

export const listDepartmentsSchema = baseSchema.merge(
  z.object({
    from: z.number().default(0).describe('Starting index for pagination'),
    limit: z.number().default(50).describe('Number of departments to retrieve'),
  })
);

export const getDepartmentSchema = baseSchema.merge(
  z.object({
    department_id: z.string().describe('Department ID'),
  })
);

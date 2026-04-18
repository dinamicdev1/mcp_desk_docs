import type { ZohoDeskAPI } from '../client/index.js';
import {
  listArticlesSchema,
  getArticleSchema,
  searchArticlesSchema,
  createArticleSchema,
  updateArticleSchema,
  moveToTrashSchema,
  restoreFromTrashSchema,
  deleteArticlesSchema,
  moveArticlesSchema,
  checkPermalinkSchema,
  listTrashedArticlesSchema,
  listVersionsSchema,
  getVersionSchema,
  listTranslationsSchema,
  createTranslationSchema,
  updateTranslationSchema,
  deleteTranslationSchema,
  listAttachmentsSchema,
  deleteAttachmentSchema,
  listRelatedArticlesSchema,
  addRelatedArticlesSchema,
  removeRelatedArticleSchema,
  articleFeedbackSchema,
  baseSchema,
} from '../utils/schemas.js';
import { resolveToken, resolveOrgId, toolResult } from './_helpers.js';

export function createArticleTools(api: ZohoDeskAPI) {

  return {
    // ============================================
    // CRUD BÁSICO
    // ============================================

    list_articles: {
      description:
        'Lista artículos de la base de conocimientos de Zoho Desk. Permite filtrar por categoría, sección, estado, visibilidad y ordenar por diferentes campos.',
      parameters: listArticlesSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        const articles = await api.articles.listArticles({
          from: args.from,
          limit: args.limit,
          categoryId: args.category_id,
          sectionId: args.section_id,
          status: args.status,
          sortBy: args.sort_by,
          orderBy: args.order_by,
          ownerId: args.owner_id,
          departmentId: args.department_id,
        });

        return toolResult(articles);
      },
    },

    get_article: {
      description: 'Obtiene los detalles completos de un artículo específico por su ID.',
      parameters: getArticleSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const article = await api.articles.getArticle(args.article_id);
        return toolResult(article);
      },
    },

    search_articles: {
      description: 'Busca artículos en la base de conocimientos por texto.',
      parameters: searchArticlesSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const articles = await api.articles.searchArticles(args.search_str, {
          from: args.from,
          limit: args.limit,
          categoryId: args.category_id,
          departmentId: args.department_id,
          status: args.status,
        });
        return toolResult(articles);
      },
    },

    create_article: {
      description: 'Crea un nuevo artículo en la base de conocimientos. El contenido puede incluir HTML.',
      parameters: createArticleSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const article = await api.articles.createArticle({
          title: args.title,
          answer: args.answer,
          categoryId: args.category_id,
          sectionId: args.section_id,
          status: args.status,
          visibility: args.visibility,
          authorId: args.author_id,
          ownerId: args.owner_id,
          expiryDate: args.expiry_date,
          reviewDate: args.review_date,
          summary: args.summary,
          seoTitle: args.seo_title,
          seoDescription: args.seo_description,
          seoKeywords: args.seo_keywords,
          tags: args.tags,
          permalink: args.permalink,
          disableComments: args.disable_comments,
        });
        return toolResult(article);
      },
    },

    update_article: {
      description: 'Actualiza un artículo existente. Solo se modifican los campos proporcionados.',
      parameters: updateArticleSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const article = await api.articles.updateArticle(args.article_id, {
          title: args.title,
          answer: args.answer,
          categoryId: args.category_id,
          sectionId: args.section_id,
          status: args.status,
          visibility: args.visibility,
          ownerId: args.owner_id,
          expiryDate: args.expiry_date,
          reviewDate: args.review_date,
          summary: args.summary,
          seoTitle: args.seo_title,
          seoDescription: args.seo_description,
          seoKeywords: args.seo_keywords,
          tags: args.tags,
          permalink: args.permalink,
          disableComments: args.disable_comments,
        });
        return toolResult(article);
      },
    },

    // ============================================
    // PAPELERA Y ELIMINACIÓN
    // ============================================

    move_articles_to_trash: {
      description: 'Mueve uno o más artículos a la papelera.',
      parameters: moveToTrashSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        await api.articles.moveToTrash(args.article_ids);
        return {
          content: [{ type: 'text' as const, text: `✅ ${args.article_ids.length} article(s) moved to trash.` }],
        };
      },
    },

    restore_articles_from_trash: {
      description: 'Restaura uno o más artículos de la papelera.',
      parameters: restoreFromTrashSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        await api.articles.restoreFromTrash(args.article_ids);
        return {
          content: [{ type: 'text' as const, text: `✅ ${args.article_ids.length} article(s) restored from trash.` }],
        };
      },
    },

    delete_articles_permanently: {
      description: 'Elimina permanentemente artículos (deben estar en papelera primero).',
      parameters: deleteArticlesSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        await api.articles.deleteArticles(args.article_ids);
        return {
          content: [{ type: 'text' as const, text: `✅ ${args.article_ids.length} article(s) permanently deleted.` }],
        };
      },
    },

    list_trashed_articles: {
      description: 'Lista artículos en la papelera.',
      parameters: listTrashedArticlesSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const articles = await api.articles.listTrashedArticles({
          from: args.from,
          limit: args.limit,
        });
        return toolResult(articles);
      },
    },

    // ============================================
    // MOVER Y ORGANIZAR
    // ============================================

    move_articles: {
      description: 'Mueve uno o más artículos a otra categoría/sección.',
      parameters: moveArticlesSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        await api.articles.moveArticles(args.article_ids, args.category_id, args.section_id);
        return {
          content: [{ type: 'text' as const, text: `✅ ${args.article_ids.length} article(s) moved.` }],
        };
      },
    },

    check_permalink: {
      description: 'Verifica si un permalink está disponible.',
      parameters: checkPermalinkSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const result = await api.articles.checkPermalink(args.permalink, args.article_id);
        return toolResult(result);
      },
    },

    get_my_articles: {
      description: 'Obtiene mis artículos (drafts, approvals, published).',
      parameters: baseSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const result = await api.articles.getMyArticles();
        return toolResult(result);
      },
    },

    // ============================================
    // VERSIONES
    // ============================================

    list_article_versions: {
      description: 'Lista todas las versiones de un artículo.',
      parameters: listVersionsSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const versions = await api.articles.listVersions(args.article_id);
        return toolResult(versions);
      },
    },

    get_article_version: {
      description: 'Obtiene una versión específica de un artículo.',
      parameters: getVersionSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const version = await api.articles.getVersion(args.article_id, args.version);
        return toolResult(version);
      },
    },

    // ============================================
    // TRADUCCIONES
    // ============================================

    list_article_translations: {
      description: 'Lista todas las traducciones de un artículo.',
      parameters: listTranslationsSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const translations = await api.articles.listTranslations(args.article_id);
        return toolResult(translations);
      },
    },

    create_article_translation: {
      description: 'Crea una nueva traducción para un artículo.',
      parameters: createTranslationSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const translation = await api.articles.createTranslation(args.article_id, {
          locale: args.locale,
          title: args.title,
          answer: args.answer,
          status: args.status,
        });
        return toolResult(translation);
      },
    },

    update_article_translation: {
      description: 'Actualiza una traducción existente.',
      parameters: updateTranslationSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const translation = await api.articles.updateTranslation(args.article_id, args.translation_id, {
          title: args.title,
          answer: args.answer,
          status: args.status,
        });
        return toolResult(translation);
      },
    },

    delete_article_translation: {
      description: 'Elimina una traducción.',
      parameters: deleteTranslationSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        await api.articles.deleteTranslation(args.article_id, args.translation_id);
        return {
          content: [{ type: 'text' as const, text: `✅ Translation deleted.` }],
        };
      },
    },

    // ============================================
    // ADJUNTOS
    // ============================================

    list_article_attachments: {
      description: 'Lista todos los archivos adjuntos de un artículo.',
      parameters: listAttachmentsSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const attachments = await api.articles.listAttachments(args.article_id);
        return toolResult(attachments);
      },
    },

    delete_article_attachment: {
      description: 'Elimina un archivo adjunto de un artículo.',
      parameters: deleteAttachmentSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        await api.articles.deleteAttachment(args.article_id, args.attachment_id);
        return {
          content: [{ type: 'text' as const, text: `✅ Attachment deleted.` }],
        };
      },
    },

    // ============================================
    // ARTÍCULOS RELACIONADOS
    // ============================================

    list_related_articles: {
      description: 'Lista los artículos relacionados de un artículo.',
      parameters: listRelatedArticlesSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const related = await api.articles.listRelatedArticles(args.article_id);
        return toolResult(related);
      },
    },

    add_related_articles: {
      description: 'Asocia artículos relacionados a un artículo.',
      parameters: addRelatedArticlesSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        await api.articles.addRelatedArticles(args.article_id, args.related_article_ids);
        return {
          content: [{ type: 'text' as const, text: `✅ ${args.related_article_ids.length} related article(s) added.` }],
        };
      },
    },

    remove_related_article: {
      description: 'Elimina la relación con un artículo.',
      parameters: removeRelatedArticleSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        await api.articles.removeRelatedArticle(args.article_id, args.related_article_id);
        return {
          content: [{ type: 'text' as const, text: `✅ Related article removed.` }],
        };
      },
    },

    // ============================================
    // FEEDBACK Y CONTADORES
    // ============================================

    like_article: {
      description: 'Registra un like en un artículo.',
      parameters: articleFeedbackSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        await api.articles.likeArticle(args.article_id);
        return {
          content: [{ type: 'text' as const, text: `✅ Article liked.` }],
        };
      },
    },

    dislike_article: {
      description: 'Registra un dislike en un artículo.',
      parameters: articleFeedbackSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        await api.articles.dislikeArticle(args.article_id);
        return {
          content: [{ type: 'text' as const, text: `✅ Article disliked.` }],
        };
      },
    },

    mark_article_as_viewed: {
      description: 'Incrementa el contador de vistas de un artículo.',
      parameters: articleFeedbackSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        await api.articles.markAsViewed(args.article_id);
        return {
          content: [{ type: 'text' as const, text: `✅ Article marked as viewed.` }],
        };
      },
    },
  };
}

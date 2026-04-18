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
  checkPermalinkSchema,
  listTrashedArticlesSchema,
  listArticleHistorySchema,
  getHistoryEntrySchema,
  listTranslationsSchema,
  createTranslationSchema,
  updateTranslationSchema,
  getTranslationSchema,
  moveTranslationToTrashSchema,
  listTranslationAttachmentsSchema,
  dissociateAttachmentsSchema,
  articleFeedbackSchema,
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
          content: [{ type: 'text' as const, text: `${args.article_ids.length} article(s) moved to trash.` }],
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
          content: [{ type: 'text' as const, text: `${args.article_ids.length} article(s) restored from trash.` }],
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
          content: [{ type: 'text' as const, text: `${args.article_ids.length} article(s) permanently deleted.` }],
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

    // ============================================
    // HISTORIAL
    // ============================================

    list_article_history: {
      description: 'Lista el historial de cambios de un articulo.',
      parameters: listArticleHistorySchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        const history = await api.articles.listArticleHistory(args.article_id);
        return toolResult(history);
      },
    },

    get_history_entry: {
      description: 'Obtiene una entrada especifica del historial de un articulo.',
      parameters: getHistoryEntrySchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        const entry = await api.articles.getHistoryEntry(args.article_id, args.entry_id);
        return toolResult(entry);
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

    get_article_translation: {
      description: 'Obtiene una traduccion especifica de un articulo por su locale.',
      parameters: getTranslationSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        const translation = await api.articles.getTranslation(args.article_id, args.locale);
        return toolResult(translation);
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
      description: 'Actualiza una traduccion existente (identificada por locale).',
      parameters: updateTranslationSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);
        const translation = await api.articles.updateTranslation(
          args.article_id,
          args.locale,
          { title: args.title, answer: args.answer, status: args.status }
        );
        return toolResult(translation);
      },
    },

    move_article_translation_to_trash: {
      description: 'Mueve una traduccion a la papelera (identificada por locale).',
      parameters: moveTranslationToTrashSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        await api.articles.moveTranslationToTrash(args.article_id, args.locale);
        return toolResult({ success: true, message: 'Translation moved to trash' });
      },
    },

    // ============================================
    // ADJUNTOS
    // ============================================

    list_article_translation_attachments: {
      description: 'Lista los adjuntos de una traduccion de articulo.',
      parameters: listTranslationAttachmentsSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        const attachments = await api.articles.listTranslationAttachments(args.article_id, args.locale);
        return toolResult(attachments);
      },
    },

    dissociate_article_attachments: {
      description: 'Desasocia uno o mas adjuntos de una traduccion de articulo.',
      parameters: dissociateAttachmentsSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        await api.articles.dissociateAttachments(
          args.article_id,
          args.locale,
          args.attachment_ids
        );
        return toolResult({ success: true, count: args.attachment_ids.length });
      },
    },

    // ============================================
    // FEEDBACK
    // ============================================

    like_article: {
      description: 'Registra like en una traduccion de articulo (requiere locale).',
      parameters: articleFeedbackSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        await api.articles.likeArticle(args.article_id, args.locale);
        return toolResult({ success: true });
      },
    },

    dislike_article: {
      description: 'Registra dislike en una traduccion de articulo (requiere locale).',
      parameters: articleFeedbackSchema,
      execute: async (args: any) => {
        await resolveToken(api, args.refresh_token);
        await resolveOrgId(api, args.org_id);

        await api.articles.dislikeArticle(args.article_id, args.locale);
        return toolResult({ success: true });
      },
    },
  };
}

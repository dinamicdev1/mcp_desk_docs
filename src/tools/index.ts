import type { ZohoDeskAPI } from '../client/index.js';
import type { ZohoDeskConfig } from '../types/index.js';
import { createOAuthTools } from './oauth.js';
import { createArticleTools } from './articles.js';
import { createCategoryTools } from './categories.js';
import { createSectionTools } from './sections.js';
import { createDepartmentTools } from './departments.js';
import { createMetaTools } from './meta.js';

export function createAllTools(api: ZohoDeskAPI, config: ZohoDeskConfig) {
  return {
    ...createOAuthTools(config, api),
    ...createMetaTools(api),
    ...createArticleTools(api),
    ...createCategoryTools(api),
    ...createSectionTools(api),
    ...createDepartmentTools(api),
  };
}

export { createOAuthTools } from './oauth.js';
export { createMetaTools } from './meta.js';
export { createArticleTools } from './articles.js';
export { createCategoryTools } from './categories.js';
export { createSectionTools } from './sections.js';
export { createDepartmentTools } from './departments.js';

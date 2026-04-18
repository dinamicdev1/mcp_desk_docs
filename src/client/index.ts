import { ZohoDeskClient } from './zoho-client.js';
import { ArticlesService } from './services/articles.js';
import { CategoriesService } from './services/categories.js';
import { SectionsService } from './services/sections.js';
import { DepartmentsService } from './services/departments.js';
import { OrganizationsService } from './services/organizations.js';
import type { ZohoDeskConfig } from '../types/index.js';

export class ZohoDeskAPI {
  public client: ZohoDeskClient;
  public articles: ArticlesService;
  public categories: CategoriesService;
  public sections: SectionsService;
  public departments: DepartmentsService;
  public organizations: OrganizationsService;

  constructor(config: ZohoDeskConfig) {
    this.client = new ZohoDeskClient(config);
    this.articles = new ArticlesService(this.client);
    this.categories = new CategoriesService(this.client);
    this.sections = new SectionsService(this.client);
    this.departments = new DepartmentsService(this.client);
    this.organizations = new OrganizationsService(this.client);
  }
}

export * from './zoho-client.js';
export * from './services/articles.js';
export * from './services/categories.js';
export * from './services/sections.js';
export * from './services/departments.js';
export * from './services/organizations.js';

// Zoho Desk API Configuration
export interface ZohoDeskConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  region: 'com' | 'eu' | 'in' | 'com.au' | 'jp';
  orgId: string;
  oauthScopes: string[];
  defaultDepartmentId?: string;
  defaultOrgId?: string;
}

// OAuth Token Response
export interface ZohoTokenResponse {
  access_token: string;
  expires_in: number;
  api_domain: string;
  token_type: string;
}

// API Response Types
export interface ZohoDeskAPIResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface ZohoDeskListResponse<T> {
  data: T[];
}

// Article Types (basado en documentación oficial)
export interface ZohoDeskArticle {
  id: string;
  title: string;
  answer: string;
  answerOrg?: string;
  position?: number;
  categoryId: string;
  category?: ZohoDeskCategory;
  sectionId?: string;
  section?: ZohoDeskSection;
  permalink: string;
  status: 'Draft' | 'In Review' | 'Approved' | 'Published' | 'Unpublished';
  visibility: 'Agents' | 'All' | 'Logged in Users' | 'Custom access';
  createdTime: string;
  modifiedTime: string;
  authorId: string;
  author?: ZohoDeskUser;
  ownerId: string;
  owner?: ZohoDeskUser;
  usageCount?: number;
  viewCount?: number;
  likeCount?: number;
  dislikeCount?: number;
  feedbackCount?: number;
  commentCount?: number;
  attachmentCount?: number;
  translationCount?: number;
  expiryDate?: string;
  reviewDate?: string;
  summary?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  tags?: string[];
  webUrl?: string;
  locale?: string;
  latestVersion?: number;
  latestVersionStatus?: string;
  translationAvailable?: boolean;
  sourceLocale?: string;
  primaryArticle?: boolean;
  disableComments?: boolean;
  isTrashed?: boolean;
  trashedTime?: string;
  latestPublishedVersion?: string;
  portalUrl?: string;
  departments?: ZohoDeskDepartment[];
  modifiedBy?: ZohoDeskUser;
  rootCategoryId?: string;
}

export interface CreateArticleDTO {
  title: string;
  answer: string;
  categoryId: string;
  sectionId?: string;
  status?: 'Draft' | 'In Review' | 'Approved' | 'Published';
  authorId?: string;
  ownerId?: string;
  expiryDate?: string;
  reviewDate?: string;
  summary?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  tags?: string[];
  permalink?: string;
  visibility?: 'Agents' | 'All' | 'Logged in Users' | 'Custom access';
  disableComments?: boolean;
}

export interface UpdateArticleDTO {
  title?: string;
  answer?: string;
  categoryId?: string;
  sectionId?: string;
  status?: 'Draft' | 'In Review' | 'Approved' | 'Published';
  ownerId?: string;
  expiryDate?: string;
  reviewDate?: string;
  summary?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  tags?: string[];
  permalink?: string;
  visibility?: 'Agents' | 'All' | 'Logged in Users' | 'Custom access';
  disableComments?: boolean;
}

// Category Types (basado en documentación oficial)
export interface ZohoDeskCategory {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  displayOrder?: number;
  createdTime: string;
  modifiedTime: string;
  articlesCount?: number;
  sectionsCount?: number;
  createdBy?: ZohoDeskUser;
  modifiedBy?: ZohoDeskUser;
  locale?: string;
  translationsAvailable?: string[];
  departments?: ZohoDeskDepartment[];
  isTrashed?: boolean;
  isDeleted?: boolean;
  portalUrl?: string;
  visibility?: 'Agents' | 'All' | 'Logged in Users' | 'Custom access';
  userPermissions?: CategoryPermission[];
  childCount?: number;
}

export interface CreateCategoryDTO {
  name: string;
  description?: string;
  displayOrder?: number;
  visibility?: 'Agents' | 'All' | 'Logged in Users' | 'Custom access';
}

export interface UpdateCategoryDTO {
  name?: string;
  description?: string;
  displayOrder?: number;
  visibility?: 'Agents' | 'All' | 'Logged in Users' | 'Custom access';
}

export interface CategoryPermission {
  id: string;
  type: 'Custom' | 'UserGroup';
  permission: 'FULL_ACCESS' | 'READ';
}

// Section Types (basado en documentación oficial)
export interface ZohoDeskSection {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  category?: ZohoDeskCategory;
  displayOrder?: number;
  createdTime: string;
  modifiedTime: string;
  articlesCount?: number;
  locale?: string;
  createdBy?: ZohoDeskUser;
  modifiedBy?: ZohoDeskUser;
  visibility?: 'Agents' | 'All' | 'Logged in Users' | 'Custom access';
  isTrashed?: boolean;
  portalUrl?: string;
}

export interface CreateSectionDTO {
  name: string;
  description?: string;
  displayOrder?: number;
  visibility?: 'Agents' | 'All' | 'Logged in Users' | 'Custom access';
}

export interface UpdateSectionDTO {
  name?: string;
  description?: string;
  displayOrder?: number;
  visibility?: 'Agents' | 'All' | 'Logged in Users' | 'Custom access';
}

// Article Translation Types
export interface ZohoDeskTranslation {
  id: string;
  articleId: string;
  locale: string;
  title: string;
  answer: string;
  status: 'Draft' | 'In Review' | 'Approved' | 'Published';
  createdTime: string;
  modifiedTime: string;
  author?: ZohoDeskUser;
}

export interface CreateTranslationDTO {
  locale: string;
  title: string;
  answer: string;
  status?: 'Draft' | 'In Review' | 'Approved' | 'Published';
}

export interface UpdateTranslationDTO {
  title?: string;
  answer?: string;
  status?: 'Draft' | 'In Review' | 'Approved' | 'Published';
}

// Article Version Types
export interface ZohoDeskArticleVersion {
  version: number;
  title: string;
  answer: string;
  status: string;
  createdTime: string;
  modifiedTime: string;
  modifiedBy?: ZohoDeskUser;
}

// Attachment Types
export interface ZohoDeskAttachment {
  id: string;
  name: string;
  size: number;
  contentType?: string;
  href?: string;
  publicUrl?: string;
  createdTime: string;
  creatorId?: string;
}

// Department Types
export interface ZohoDeskDepartment {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  associatedAgentIds?: string[];
  nameInCustomerPortal?: string;
  createdTime?: string;
  modifiedTime?: string;
}

// Organization Types
export interface ZohoDeskOrganization {
  id: string;
  companyName: string;
  portalName?: string;
  isDefault?: boolean;
  timeZone?: string;
  phone?: string;
  fax?: string;
  primaryContact?: string;
  website?: string;
  primaryEmail?: string;
}

// User Types
export interface ZohoDeskUser {
  id: string;
  name: string;
  email?: string;
  photoURL?: string;
  roleId?: string;
  status?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
}

// Folder / Root Category Types
export interface ZohoDeskFolder {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  displayOrder?: number;
  visibility?: string;
  articlesCount?: number;
  sectionsCount?: number;
  childCount?: number;
  createdTime: string;
  modifiedTime: string;
}

// Category Tree Response
export interface ZohoDeskCategoryTree {
  id: string;
  name: string;
  description?: string;
  displayOrder?: number;
  sections?: ZohoDeskSection[];
  childCategories?: ZohoDeskCategoryTree[];
  articlesCount?: number;
}

// Search/Filter Parameters
export interface ArticleSearchParams {
  from?: number;
  limit?: number;
  categoryId?: string;
  sectionId?: string;
  status?: 'Draft' | 'In Review' | 'Approved' | 'Published' | 'Unpublished';
  sortBy?: 'createdTime' | 'modifiedTime' | 'position' | 'viewCount' | 'likeCount' | 'mostUsed' | 'recentlyUsed';
  orderBy?: 'asc' | 'desc';
  isTrashed?: boolean;
  ownerId?: string;
  departmentId?: string;
}

export interface CategorySearchParams {
  from?: number;
  limit?: number;
  departmentId?: string;
  isTrashed?: boolean;
}

export interface SectionSearchParams {
  from?: number;
  limit?: number;
  isTrashed?: boolean;
}

// Related Articles
export interface RelatedArticle {
  id: string;
  title: string;
  permalink: string;
  portalUrl?: string;
}

// Comment Types
export interface ZohoDeskComment {
  id: string;
  content: string;
  contentType?: string;
  createdTime: string;
  modifiedTime?: string;
  commenterId?: string;
  commenter?: ZohoDeskUser;
}

export interface CreateCommentDTO {
  content: string;
  contentType?: 'plainText' | 'html';
  isPublic?: boolean;
  visibility?: string;
}

// My Articles Response
export interface MyArticlesResponse {
  approvals?: ZohoDeskArticle[];
  drafts?: ZohoDeskArticle[];
  published?: ZohoDeskArticle[];
}

// Permalink Check Response
export interface PermalinkCheckResponse {
  isAvailable: boolean;
  suggestedPermalink?: string;
}

// Bulk Operations
export interface BulkMoveDTO {
  articleIds: string[];
  categoryId: string;
  sectionId?: string;
}

export interface BulkTrashDTO {
  articleIds: string[];
}

export interface BulkRestoreDTO {
  articleIds: string[];
}

export interface BulkDeleteDTO {
  articleIds: string[];
}

// Settings
export interface KBSettings {
  sourceLanguage?: string;
  translationLanguages?: string[];
  defaultVisibility?: string;
  commentsEnabled?: boolean;
  feedbackEnabled?: boolean;
}

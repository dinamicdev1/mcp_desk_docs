#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Zoho Desk API configuration
const ZOHO_DESK_API_BASE = process.env.ZOHO_DESK_API_BASE || "https://desk.zoho.com/api/v1";
const ZOHO_ORG_ID = process.env.ZOHO_ORG_ID || "";
const ZOHO_ACCESS_TOKEN = process.env.ZOHO_ACCESS_TOKEN || "";

// Define Zod schemas for validation
const SearchArticlesSchema = z.object({
  query: z.string().min(1),
  limit: z.number().min(1).max(100).optional().default(10),
});

const GetArticleSchema = z.object({
  articleId: z.string().min(1),
});

const ListCategoriesSchema = z.object({
  departmentId: z.string().optional(),
});

// Create server instance
const server = new Server(
  {
    name: "zoho-desk-docs",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search-articles",
        description: "Search for knowledge base articles in Zoho Desk by keyword or phrase",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query to find relevant articles",
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return (1-100, default: 10)",
              default: 10,
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get-article",
        description: "Get full content of a specific knowledge base article by ID",
        inputSchema: {
          type: "object",
          properties: {
            articleId: {
              type: "string",
              description: "The ID of the article to retrieve",
            },
          },
          required: ["articleId"],
        },
      },
      {
        name: "list-categories",
        description: "List all knowledge base categories (optionally filtered by department)",
        inputSchema: {
          type: "object",
          properties: {
            departmentId: {
              type: "string",
              description: "Optional department ID to filter categories",
            },
          },
        },
      },
    ],
  };
});

// Helper function for making Zoho Desk API requests
async function makeZohoDeskRequest<T>(
  endpoint: string,
  method: string = "GET"
): Promise<T | null> {
  if (!ZOHO_ACCESS_TOKEN || !ZOHO_ORG_ID) {
    throw new Error(
      "Missing Zoho Desk credentials. Please set ZOHO_ACCESS_TOKEN and ZOHO_ORG_ID environment variables."
    );
  }

  const url = `${ZOHO_DESK_API_BASE}${endpoint}`;
  const headers = {
    Authorization: `Zoho-oauthtoken ${ZOHO_ACCESS_TOKEN}`,
    orgId: ZOHO_ORG_ID,
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(url, { method, headers });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${errorText}`
      );
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error("Error making Zoho Desk request:", error);
    throw error;
  }
}

interface Article {
  id?: string;
  title?: string;
  summary?: string;
  answer?: string;
  categoryId?: string;
  categoryName?: string;
  modifiedTime?: string;
  author?: {
    name?: string;
  };
  permalink?: string;
}

interface SearchResult {
  data?: Article[];
  count?: number;
}

interface Category {
  id?: string;
  name?: string;
  description?: string;
  articlesCount?: number;
}

interface CategoriesResult {
  data?: Category[];
}

// Format article data for display
function formatArticle(article: Article, includeContent: boolean = false): string {
  const lines = [
    `ID: ${article.id || "Unknown"}`,
    `Title: ${article.title || "Unknown"}`,
    `Category: ${article.categoryName || "Unknown"}`,
  ];

  if (article.author?.name) {
    lines.push(`Author: ${article.author.name}`);
  }

  if (article.modifiedTime) {
    lines.push(`Last Modified: ${article.modifiedTime}`);
  }

  if (article.permalink) {
    lines.push(`URL: ${article.permalink}`);
  }

  if (article.summary) {
    lines.push(`Summary: ${article.summary}`);
  }

  if (includeContent && article.answer) {
    lines.push(`\nContent:\n${article.answer}`);
  }

  lines.push("---");
  return lines.join("\n");
}

// Format category data for display
function formatCategory(category: Category): string {
  return [
    `ID: ${category.id || "Unknown"}`,
    `Name: ${category.name || "Unknown"}`,
    `Description: ${category.description || "No description"}`,
    `Articles Count: ${category.articlesCount || 0}`,
    "---",
  ].join("\n");
}

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "search-articles") {
      const { query, limit } = SearchArticlesSchema.parse(args);

      // Search articles using Zoho Desk API
      const searchEndpoint = `/articles/search?query=${encodeURIComponent(
        query
      )}&limit=${limit}`;
      const searchData = await makeZohoDeskRequest<SearchResult>(searchEndpoint);

      if (!searchData || !searchData.data) {
        return {
          content: [
            {
              type: "text",
              text: "No articles found or failed to retrieve search results",
            },
          ],
        };
      }

      const articles = searchData.data;
      if (articles.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No articles found for query: "${query}"`,
            },
          ],
        };
      }

      const formattedArticles = articles.map((article) =>
        formatArticle(article, false)
      );
      const resultsText = `Found ${articles.length} article(s) for "${query}":\n\n${formattedArticles.join(
        "\n"
      )}`;

      return {
        content: [
          {
            type: "text",
            text: resultsText,
          },
        ],
      };
    } else if (name === "get-article") {
      const { articleId } = GetArticleSchema.parse(args);

      // Get article details
      const articleEndpoint = `/articles/${articleId}`;
      const articleData = await makeZohoDeskRequest<Article>(articleEndpoint);

      if (!articleData) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to retrieve article with ID: ${articleId}`,
            },
          ],
        };
      }

      const formattedArticle = formatArticle(articleData, true);
      return {
        content: [
          {
            type: "text",
            text: formattedArticle,
          },
        ],
      };
    } else if (name === "list-categories") {
      const { departmentId } = ListCategoriesSchema.parse(args);

      // Build endpoint with optional department filter
      let categoriesEndpoint = "/categories";
      if (departmentId) {
        categoriesEndpoint += `?departmentId=${departmentId}`;
      }

      const categoriesData = await makeZohoDeskRequest<CategoriesResult>(
        categoriesEndpoint
      );

      if (!categoriesData || !categoriesData.data) {
        return {
          content: [
            {
              type: "text",
              text: "No categories found or failed to retrieve categories",
            },
          ],
        };
      }

      const categories = categoriesData.data;
      if (categories.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No categories available",
            },
          ],
        };
      }

      const formattedCategories = categories.map(formatCategory);
      const categoriesText = `Found ${categories.length} category/categories:\n\n${formattedCategories.join(
        "\n"
      )}`;

      return {
        content: [
          {
            type: "text",
            text: categoriesText,
          },
        ],
      };
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Invalid arguments: ${error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ")}`
      );
    }
    throw error;
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Zoho Desk Documentation MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});

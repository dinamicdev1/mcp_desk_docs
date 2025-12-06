# Usage Examples

This document provides examples of how to use the Zoho Desk Documentation MCP Server.

## Example 1: Searching for Articles

When using with Claude Desktop or another MCP client, you can ask:

```
"Search for articles about password reset"
```

The server will execute the `search-articles` tool and return results like:

```
Found 3 article(s) for "password reset":

ID: 1234567890
Title: How to Reset Your Password
Category: Account Management
Author: Support Team
Last Modified: 2024-12-01T10:30:00Z
URL: https://help.example.com/password-reset
Summary: Step-by-step guide to reset your account password
---

ID: 1234567891
Title: Password Reset Email Not Received
Category: Troubleshooting
Author: Tech Support
Last Modified: 2024-11-28T15:45:00Z
URL: https://help.example.com/password-email
Summary: Solutions when you don't receive the password reset email
---
```

## Example 2: Getting Full Article Content

After finding an article ID from search results, you can retrieve the full content:

```
"Get the full content of article 1234567890"
```

The server will return:

```
ID: 1234567890
Title: How to Reset Your Password
Category: Account Management
Author: Support Team
Last Modified: 2024-12-01T10:30:00Z
URL: https://help.example.com/password-reset
Summary: Step-by-step guide to reset your account password

Content:
<Full article HTML or text content here>
Step 1: Click on "Forgot Password" on the login page
Step 2: Enter your email address
Step 3: Check your email for the reset link
Step 4: Click the link and enter your new password
...
```

## Example 3: Browsing Categories

To see available documentation categories:

```
"Show me all documentation categories"
```

Response:

```
Found 5 category/categories:

ID: cat_001
Name: Getting Started
Description: Basic information for new users
Articles Count: 15
---

ID: cat_002
Name: Account Management
Description: Managing your account settings
Articles Count: 23
---

ID: cat_003
Name: Troubleshooting
Description: Common issues and solutions
Articles Count: 42
---
```

## Example 4: Department-Specific Categories

If your Zoho Desk has multiple departments, you can filter categories:

```
"List categories for department dept_123"
```

## Example Workflow

A typical workflow might look like:

1. **List categories** to understand the documentation structure
2. **Search for articles** using keywords relevant to your question
3. **Get full article content** for the most relevant result
4. Use the information to solve your problem

## Integration with AI Assistants

When integrated with Claude or other AI assistants, you can have natural conversations:

```
User: "I need help resetting my password but I'm not receiving the email"
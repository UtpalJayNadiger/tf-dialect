#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { loadConfig, TerraformStyleConfig } from './config.js';
import { listExamples } from './examples.js';
import { validateSnippet } from './validator.js';
import { generateResource, GenerateResourceParams } from './generator.js';

let config: TerraformStyleConfig;

const tools: Tool[] = [
  {
    name: 'get_style_guide',
    description:
      'Get the complete Terraform style guide / dialect configuration for this organization',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'list_examples',
    description:
      'List Terraform code examples from the style guide, optionally filtered by resource type or search term',
    inputSchema: {
      type: 'object',
      properties: {
        resourceType: {
          type: 'string',
          description: 'Filter examples by resource type (e.g., "s3_bucket", "rds")',
        },
        search: {
          type: 'string',
          description: 'Search term to filter examples',
        },
      },
    },
  },
  {
    name: 'validate_snippet',
    description:
      'Validate a Terraform code snippet against the organization style guide and security defaults',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The Terraform code snippet to validate',
        },
        filePath: {
          type: 'string',
          description: 'Optional file path for context',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'generate_resource',
    description:
      'Generate a Terraform resource following organization standards and security defaults',
    inputSchema: {
      type: 'object',
      properties: {
        resourceType: {
          type: 'string',
          description: 'AWS resource type (e.g., "aws_s3_bucket", "aws_db_instance")',
        },
        env: {
          type: 'string',
          description: 'Environment (e.g., "prod", "dev", "staging")',
        },
        service: {
          type: 'string',
          description: 'Service or application name',
        },
        purpose: {
          type: 'string',
          description: 'Optional purpose or component identifier',
        },
        extraTags: {
          type: 'object',
          description: 'Additional tags beyond defaults',
          additionalProperties: { type: 'string' },
        },
      },
      required: ['resourceType', 'env', 'service'],
    },
  },
];

const server = new Server(
  {
    name: 'tf-dialect',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_style_guide': {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(config, null, 2),
            },
          ],
        };
      }

      case 'list_examples': {
        const resourceType = (args?.resourceType as string) || null;
        const search = (args?.search as string) || null;
        const examples = listExamples(config, resourceType, search);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ examples }, null, 2),
            },
          ],
        };
      }

      case 'validate_snippet': {
        const code = args?.code as string;
        const filePath = (args?.filePath as string) || null;
        
        if (!code) {
          throw new Error('code parameter is required');
        }

        const result = validateSnippet(code, config, filePath);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'generate_resource': {
        const resourceType = args?.resourceType as string;
        const env = args?.env as string;
        const service = args?.service as string;
        const purpose = (args?.purpose as string) || null;
        const extraTags = (args?.extraTags as Record<string, string>) || null;

        if (!resourceType || !env || !service) {
          throw new Error('resourceType, env, and service are required');
        }

        const params: GenerateResourceParams = {
          resourceType,
          env,
          service,
          purpose,
          extraTags,
        };

        const code = generateResource(params, config);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ code }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: errorMessage }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  try {
    config = loadConfig();
    console.error('✓ Loaded Terraform style config');
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('tf-dialect MCP server running on stdio');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();

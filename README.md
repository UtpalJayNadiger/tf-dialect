# tf-dialect

**tf-dialect** is an MCP (Model Context Protocol) server that exposes your organization's Terraform style guide to AI coding agents, ensuring they generate context-aware, organization-specific Infrastructure as Code instead of generic HCL.

Configure once, use with any MCP-capable coding agent (Claude Desktop, Cline, etc.).

## Quick Start

```bash
# Clone the repository
git clone https://github.com/utpaljaynadiger/tf-dialect.git
cd tf-dialect

# Install dependencies
npm install

# Build the project
npm run build

# Create your style configuration
cp terraform-style.example.yaml terraform-style.yaml

# Edit terraform-style.yaml with your organization's standards
# Then configure in your MCP client (see "Running the Server" section)
```

## Features

- 📚 **Style Guide Management**: Define your Terraform conventions in a single YAML file
- 🔍 **Validation**: Check Terraform snippets against your organization's rules
- 📝 **Code Examples**: Provide reusable snippets for common patterns
- 🛡️ **Security Defaults**: Enforce security best practices automatically
- 🏗️ **Code Generation**: Generate compliant Terraform resources
- 🤖 **AI-Native**: Works seamlessly with MCP-capable coding agents

## Installation

```bash
npm install
npm run build
```

## Configuration

1. Copy the example config:
```bash
cp terraform-style.example.yaml terraform-style.yaml
```

2. Edit `terraform-style.yaml` to match your organization's standards:

```yaml
modules:
  pattern: "root + shared-modules"
  shared_module_path: "modules/"
  prefer_shared_modules: true

naming:
  resource_format: "<project>-<env>-<component>-<extra?>"
  variable_case: "snake_case"
  output_case: "snake_case"

tagging:
  required_tags:
    - "environment"
    - "owner"
    - "cost_center"
  defaults:
    environment: "${var.environment}"
    owner: "infra-team"

security_defaults:
  s3_bucket:
    block_public_acls: true
    versioning: true
    encryption: "aws:kms"
  rds:
    storage_encrypted: true
    backup_retention_period: 7

examples:
  s3_private_bucket: |
    module "logs_bucket" {
      source = "../modules/s3-bucket"
      name   = "${local.project}-${var.environment}-logs"
      tags   = local.default_tags
    }
```

## Running the Server

### Standalone
```bash
npm run mcp
```

### With Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "tf-dialect": {
      "command": "node",
      "args": ["/absolute/path/to/tf-dialect/dist/index.js"],
      "env": {
        "TERRAFORM_STYLE_PATH": "/absolute/path/to/your/terraform-style.yaml"
      }
    }
  }
}
```

Or if `terraform-style.yaml` is in the same directory as the server:

```json
{
  "mcpServers": {
    "tf-dialect": {
      "command": "node",
      "args": ["/absolute/path/to/tf-dialect/dist/index.js"]
    }
  }
}
```

### With Cline VSCode Extension

Add to your MCP settings:

```json
{
  "mcpServers": {
    "tf-dialect": {
      "command": "node",
      "args": ["/absolute/path/to/tf-dialect/dist/index.js"]
    }
  }
}
```

## MCP Tools

The server exposes four tools that AI agents can use:

### 1. `get_style_guide`

Get the complete Terraform style guide configuration.

**Input:** None

**Output:**
```json
{
  "modules": { ... },
  "naming": { ... },
  "tagging": { ... },
  "providers": { ... },
  "security_defaults": { ... },
  "examples": { ... }
}
```

**Example agent prompt:**
> "Show me the Terraform style guide for this project"

---

### 2. `list_examples`

List code examples, optionally filtered by resource type or search term.

**Input:**
```json
{
  "resourceType": "s3_bucket",  // optional
  "search": "postgres"          // optional
}
```

**Output:**
```json
{
  "examples": [
    {
      "name": "s3_private_bucket",
      "code": "module \"logs_bucket\" { ... }"
    }
  ]
}
```

**Example agent prompts:**
> "Show me examples of S3 buckets"
> "List all RDS examples"

---

### 3. `validate_snippet`

Validate Terraform code against the style guide.

**Input:**
```json
{
  "code": "resource \"aws_s3_bucket\" \"example\" { ... }",
  "filePath": "main.tf"  // optional
}
```

**Output:**
```json
{
  "valid": false,
  "violations": [
    {
      "ruleId": "required_tag_missing",
      "severity": "error",
      "message": "Missing required tags: environment, owner",
      "line": 5,
      "suggestion": "Add the following tags: environment = \"...\", owner = \"...\""
    }
  ]
}
```

**Example agent prompts:**
> "Validate this Terraform code against our style guide"
> "Check if this S3 bucket configuration is compliant"

---

### 4. `generate_resource`

Generate a Terraform resource following organization standards.

**Input:**
```json
{
  "resourceType": "aws_s3_bucket",
  "env": "prod",
  "service": "analytics",
  "purpose": "logs",       // optional
  "extraTags": {           // optional
    "team": "data"
  }
}
```

**Output:**
```json
{
  "code": "resource \"aws_s3_bucket\" \"this\" { ... }"
}
```

**Supported resource types:**
- `aws_s3_bucket`
- `aws_db_instance`
- Others (generates generic stub with TODOs)

**Example agent prompts:**
> "Generate an S3 bucket for prod analytics logs"
> "Create an RDS instance for the staging API database"

---

## Validation Rules

tf-dialect enforces the following rules:

### Required Tags
Ensures all resources include required tags defined in your config.

### Forbidden Patterns
Blocks dangerous patterns like:
- `0.0.0.0/0` in security groups
- Hardcoded credentials
- Custom regex patterns you define

### Security Defaults
Enforces security best practices:

**S3 Buckets:**
- Block public access
- Enable versioning
- Enable encryption (KMS or AES256)

**RDS Instances:**
- Enable storage encryption
- Set backup retention period
- Other configurable defaults

### Naming Conventions
Validates resource names follow your format:
- `<project>-<env>-<component>-<extra?>`
- Checks component count and structure

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev
```

## Example Workflow

1. **Agent asks about style:**
   - Agent calls `get_style_guide`
   - Learns your organization's conventions

2. **Agent needs an example:**
   - Agent calls `list_examples` with `resourceType: "rds"`
   - Gets working RDS configuration examples

3. **Agent generates code:**
   - Agent calls `generate_resource` or writes code
   - Then calls `validate_snippet` to check compliance

4. **Agent fixes violations:**
   - Reads violation suggestions
   - Updates code to be compliant

## Use Cases

- **Onboarding**: New team members' AI assistants learn your standards instantly
- **Consistency**: All Terraform code follows the same patterns across teams
- **Security**: Enforce security defaults automatically in generated code
- **Productivity**: AI generates compliant code on first try, not generic HCL

## License

MIT

## Contributing

Contributions welcome! This is an OSS-friendly project designed for IaC power users.

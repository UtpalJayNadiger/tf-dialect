import { TerraformStyleConfig } from './config.js';

export interface GenerateResourceParams {
  resourceType: string;
  env: string;
  service: string;
  purpose?: string | null;
  extraTags?: Record<string, string> | null;
}

export function generateResource(
  params: GenerateResourceParams,
  config: TerraformStyleConfig
): string {
  const { resourceType, env, service, purpose, extraTags } = params;

  const name = buildResourceName(service, env, purpose, config);
  const tags = buildTags(extraTags || {}, config);
  
  if (resourceType === 'aws_s3_bucket') {
    return generateS3Bucket(name, tags, config);
  }
  
  if (resourceType === 'aws_db_instance') {
    return generateRDSInstance(name, tags, config);
  }

  return generateGenericResource(resourceType, name, tags);
}

function buildResourceName(
  service: string,
  env: string,
  purpose: string | null | undefined,
  config: TerraformStyleConfig
): string {
  const format = config.naming?.resource_format;
  if (!format) {
    return purpose ? `${service}-${env}-${purpose}` : `${service}-${env}`;
  }

  return format
    .replace(/<project>/g, '${local.project}')
    .replace(/<env>/g, env)
    .replace(/<component>/g, service)
    .replace(/<extra\?>/g, purpose || '')
    .replace(/--/g, '-');
}

function buildTags(
  extraTags: Record<string, string>,
  config: TerraformStyleConfig
): string {
  const defaultTags = config.tagging?.defaults || {};
  const allTags = { ...defaultTags, ...extraTags };
  
  if (Object.keys(allTags).length === 0) {
    return '  tags = local.default_tags';
  }

  const tagLines = Object.entries(allTags)
    .map(([key, value]) => `    ${key} = "${value}"`)
    .join('\n');
  
  return `  tags = {\n${tagLines}\n  }`;
}

function generateS3Bucket(
  name: string,
  tags: string,
  config: TerraformStyleConfig
): string {
  const securityDefaults = config.security_defaults?.s3_bucket || {};
  
  let code = `resource "aws_s3_bucket" "this" {
  bucket = "${name}"

${tags}
}`;

  if (securityDefaults.versioning) {
    code += `\n\nresource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id

  versioning_configuration {
    status = "Enabled"
  }
}`;
  }

  if (securityDefaults.block_public_acls || securityDefaults.block_public_policy) {
    code += `\n\nresource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = ${securityDefaults.block_public_acls || false}
  block_public_policy     = ${securityDefaults.block_public_policy || false}
  ignore_public_acls      = ${securityDefaults.block_public_acls || false}
  restrict_public_buckets = ${securityDefaults.block_public_policy || false}
}`;
  }

  if (securityDefaults.encryption) {
    const encType = securityDefaults.encryption === 'aws:kms' ? 'aws:kms' : 'AES256';
    code += `\n\nresource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "${encType}"
    }
  }
}`;
  }

  return code;
}

function generateRDSInstance(
  name: string,
  tags: string,
  config: TerraformStyleConfig
): string {
  const securityDefaults = config.security_defaults?.rds || {};
  
  return `resource "aws_db_instance" "this" {
  identifier = "${name}"

  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.micro"
  
  allocated_storage = 20
  storage_encrypted = ${securityDefaults.storage_encrypted || false}

  backup_retention_period = ${securityDefaults.backup_retention_period || 7}
  
  # TODO: Configure username, password, vpc_security_group_ids, db_subnet_group_name

${tags}
}`;
}

function generateGenericResource(
  resourceType: string,
  name: string,
  tags: string
): string {
  return `# Generated stub for ${resourceType}
# Please customize this resource according to your needs

resource "${resourceType}" "this" {
  name = "${name}"

  # TODO: Add required arguments for ${resourceType}

${tags}
}`;
}

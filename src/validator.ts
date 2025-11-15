import { TerraformStyleConfig } from './config.js';

export interface Violation {
  ruleId: string;
  severity: 'info' | 'warn' | 'error';
  message: string;
  line: number | null;
  suggestion: string | null;
}

export interface ValidationResult {
  valid: boolean;
  violations: Violation[];
}

export function validateSnippet(
  code: string,
  config: TerraformStyleConfig,
  filePath?: string | null
): ValidationResult {
  const violations: Violation[] = [];

  validateRequiredTags(code, config, violations);
  validateForbiddenPatterns(code, config, violations);
  validateSecurityDefaults(code, config, violations);
  validateNamingConventions(code, config, violations);

  return {
    valid: violations.filter((v) => v.severity === 'error').length === 0,
    violations,
  };
}

function validateRequiredTags(
  code: string,
  config: TerraformStyleConfig,
  violations: Violation[]
): void {
  const requiredTags = config.tagging?.required_tags || [];
  if (requiredTags.length === 0) return;

  const tagsBlockMatch = code.match(/tags\s*=\s*\{([^}]*)\}/s);
  if (!tagsBlockMatch) {
    violations.push({
      ruleId: 'missing_tags_block',
      severity: 'error',
      message: 'No tags block found',
      line: null,
      suggestion: `Add a tags block with required tags: ${requiredTags.join(', ')}`,
    });
    return;
  }

  const tagsContent = tagsBlockMatch[1];
  const missingTags = requiredTags.filter((tag) => {
    const tagPattern = new RegExp(`["']?${tag}["']?\\s*=`, 'i');
    return !tagPattern.test(tagsContent);
  });

  if (missingTags.length > 0) {
    violations.push({
      ruleId: 'required_tag_missing',
      severity: 'error',
      message: `Missing required tags: ${missingTags.join(', ')}`,
      line: getLineNumber(code, tagsBlockMatch.index || 0),
      suggestion: `Add the following tags: ${missingTags.map((t) => `${t} = "..."`).join(', ')}`,
    });
  }
}

function validateForbiddenPatterns(
  code: string,
  config: TerraformStyleConfig,
  violations: Violation[]
): void {
  const patterns = config.providers?.forbidden_patterns || [];
  
  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern.match, 'g');
      let match;
      
      while ((match = regex.exec(code)) !== null) {
        violations.push({
          ruleId: 'forbidden_pattern',
          severity: 'error',
          message: pattern.description,
          line: getLineNumber(code, match.index),
          suggestion: 'Remove or replace this forbidden pattern',
        });
      }
    } catch (error) {
      console.error(`Invalid regex pattern: ${pattern.match}`, error);
    }
  }
}

function validateSecurityDefaults(
  code: string,
  config: TerraformStyleConfig,
  violations: Violation[]
): void {
  const securityDefaults = config.security_defaults || {};

  if (securityDefaults.s3_bucket && /resource\s+"aws_s3_bucket"/i.test(code)) {
    validateS3Bucket(code, securityDefaults.s3_bucket, violations);
  }

  if (securityDefaults.rds && /(resource\s+"aws_db_instance"|module\s+".*rds)/i.test(code)) {
    validateRDS(code, securityDefaults.rds, violations);
  }
}

function validateS3Bucket(
  code: string,
  defaults: Record<string, boolean | string | number>,
  violations: Violation[]
): void {
  const checks: Array<[string, string, string]> = [
    ['block_public_acls', 'block_public_acls\\s*=\\s*true', 'Set block_public_acls = true'],
    ['block_public_policy', 'block_public_policy\\s*=\\s*true', 'Set block_public_policy = true'],
    ['versioning', 'versioning\\s*[={]', 'Enable versioning'],
  ];

  for (const [key, pattern, suggestion] of checks) {
    if (defaults[key] && !new RegExp(pattern, 'i').test(code)) {
      violations.push({
        ruleId: 's3_security_default',
        severity: 'warn',
        message: `S3 bucket should have ${key} enabled`,
        line: null,
        suggestion,
      });
    }
  }

  if (defaults.encryption && !/encryption/i.test(code)) {
    violations.push({
      ruleId: 's3_security_default',
      severity: 'warn',
      message: 'S3 bucket should have encryption enabled',
      line: null,
      suggestion: `Enable encryption (e.g., encryption = "${defaults.encryption}")`,
    });
  }
}

function validateRDS(
  code: string,
  defaults: Record<string, boolean | string | number>,
  violations: Violation[]
): void {
  if (defaults.storage_encrypted && !/storage_encrypted\s*=\s*true/i.test(code)) {
    violations.push({
      ruleId: 'rds_security_default',
      severity: 'warn',
      message: 'RDS instance should have storage_encrypted = true',
      line: null,
      suggestion: 'Set storage_encrypted = true',
    });
  }

  if (defaults.backup_retention_period && !/backup_retention_period/i.test(code)) {
    violations.push({
      ruleId: 'rds_security_default',
      severity: 'warn',
      message: 'RDS instance should specify backup_retention_period',
      line: null,
      suggestion: 'Set backup_retention_period = 7 (or higher)',
    });
  }
}

function validateNamingConventions(
  code: string,
  config: TerraformStyleConfig,
  violations: Violation[]
): void {
  const namingFormat = config.naming?.resource_format;
  if (!namingFormat) return;

  const componentCount = (namingFormat.match(/<[^>]+>/g) || []).length;
  if (componentCount < 2) return;

  const nameMatches = code.matchAll(/name\s*=\s*["']([^"']+)["']/g);
  
  for (const match of nameMatches) {
    const name = match[1];
    if (name.startsWith('${') || name.startsWith('var.')) continue;

    const parts = name.split('-');
    if (parts.length < componentCount) {
      violations.push({
        ruleId: 'naming_convention',
        severity: 'info',
        message: `Resource name "${name}" doesn't follow format: ${namingFormat}`,
        line: getLineNumber(code, match.index || 0),
        suggestion: `Use format: ${namingFormat} (expected ${componentCount}+ parts, got ${parts.length})`,
      });
    }
  }
}

function getLineNumber(code: string, index: number): number {
  return code.substring(0, index).split('\n').length;
}

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';

export interface ModulesConfig {
  pattern?: string;
  shared_module_path?: string;
  prefer_shared_modules?: boolean;
}

export interface NamingConfig {
  resource_format?: string;
  variable_case?: 'snake_case' | 'camelCase';
  output_case?: 'snake_case' | 'camelCase';
}

export interface TaggingConfig {
  required_tags?: string[];
  defaults?: Record<string, string>;
}

export interface ProviderConfig {
  name: string;
  version_constraint?: string;
}

export interface ForbiddenPattern {
  description: string;
  match: string;
}

export interface ProvidersConfig {
  allowed?: ProviderConfig[];
  forbidden_patterns?: ForbiddenPattern[];
}

export interface SecurityDefaultsConfig {
  s3_bucket?: Record<string, boolean | string | number>;
  rds?: Record<string, boolean | string | number>;
  [key: string]: Record<string, boolean | string | number> | undefined;
}

export interface TerraformStyleConfig {
  modules?: ModulesConfig;
  naming?: NamingConfig;
  tagging?: TaggingConfig;
  providers?: ProvidersConfig;
  security_defaults?: SecurityDefaultsConfig;
  examples?: Record<string, string>;
}

export function loadConfig(): TerraformStyleConfig {
  const configPaths = [
    process.env.TERRAFORM_STYLE_PATH,
    resolve(process.cwd(), 'terraform-style.yaml'),
    resolve(process.cwd(), 'terraform-style.yml'),
  ].filter((p): p is string => !!p);

  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      try {
        const fileContent = readFileSync(configPath, 'utf8');
        const config = yaml.load(fileContent) as TerraformStyleConfig;
        
        if (!config || typeof config !== 'object') {
          throw new Error(`Invalid config format in ${configPath}`);
        }

        return config;
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Failed to load config from ${configPath}: ${error.message}`);
        }
        throw error;
      }
    }
  }

  throw new Error(
    'No terraform-style.yaml found. Please create one in your project root or set TERRAFORM_STYLE_PATH env var.'
  );
}

export function getExamples(config: TerraformStyleConfig): Record<string, string> {
  return config.examples || {};
}

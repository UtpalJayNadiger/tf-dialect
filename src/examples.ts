import { TerraformStyleConfig } from './config.js';

export interface ExampleResult {
  name: string;
  code: string;
}

export function listExamples(
  config: TerraformStyleConfig,
  resourceType?: string | null,
  search?: string | null
): ExampleResult[] {
  const examples = config.examples || {};
  let results: ExampleResult[] = Object.entries(examples).map(([name, code]) => ({
    name,
    code,
  }));

  if (resourceType) {
    const resourceTypeLower = resourceType.toLowerCase();
    results = results.filter((ex) =>
      ex.name.toLowerCase().includes(resourceTypeLower)
    );
  }

  if (search) {
    const searchLower = search.toLowerCase();
    results = results.filter((ex) =>
      ex.name.toLowerCase().includes(searchLower) ||
      ex.code.toLowerCase().includes(searchLower)
    );
  }

  return results;
}

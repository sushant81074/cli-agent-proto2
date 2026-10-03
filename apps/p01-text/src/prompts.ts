import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

export function renderTemplate(name: string, vars: Record<string, string> = {}): string {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    let baseName = name.includes('improve-prompt.v1') ? name : `improve-prompt.v1.${name}`;

    if (!baseName.endsWith('.md')) baseName = `${baseName}.md`;


    const absolutePath = path.resolve(__dirname, '..', 'prompts', baseName);
    const template = readFileSync(absolutePath, 'utf8');

    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    const missingVars = new Set<string>();
    let match;

    placeholderRegex.lastIndex = 0;
    while ((match = placeholderRegex.exec(template)) !== null) {
        const varName = match[1]!.trim(); // Fixed: extracting match[1] capture group instead of full match array object
        if (!Object.hasOwn(vars, varName)) {
            missingVars.add(varName);
        }
    }

    if (missingVars.size > 0) throw new Error(`Template rendering failed. Missing values for placeholders: ${Array.from(missingVars).join(', ')}`);

    return template.replace(placeholderRegex, (_, varName) => {
        return vars[varName.trim()]!;
    });
}

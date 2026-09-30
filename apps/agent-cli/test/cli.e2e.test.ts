import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const appDir = fileURLToPath(new URL('..', import.meta.url));

describe('agent CLI', () => {
  it('runs src/index.ts with Node and exits 0', () => {
    const result = spawnSync(process.execPath, ['src/index.ts'], {
      cwd: appDir,
      encoding: 'utf8',
    });

    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('linked @agentic/core');
  });
});

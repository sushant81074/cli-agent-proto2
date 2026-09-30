import { describe, expect, it } from 'vitest';
import { packageName } from '../src/index.ts';

describe('@agentic/core', () => {
  it('is importable', () => {
    expect(packageName).toBe('@agentic/core');
  });
});

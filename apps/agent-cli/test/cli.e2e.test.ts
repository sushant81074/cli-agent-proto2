import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const appDir = fileURLToPath(new URL("..", import.meta.url));

describe("agent CLI", () => {
  it("starts successfully", () => {
    const result = spawnSync(process.execPath, ["src/index.ts", "--help"], {
      cwd: appDir,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
  });
});

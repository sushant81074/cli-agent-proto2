import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { JsonlTraceWriter } from "../src/jsonl.ts";

describe("JsonlTraceWriter", () => {
  it("writes one JSON object per line", async () => {
    const directory = await mkdtemp(join(tmpdir(), "agentic-trace-"));

    const filePath = join(directory, "run.jsonl");

    const writer = new JsonlTraceWriter(filePath);

    await writer.write({
      type: "run.started",
      runId: "run-123",
      timestamp: "2026-10-02T00:00:00.000Z",
    });

    await writer.write({
      type: "run.completed",
      runId: "run-123",
      timestamp: "2026-10-02T00:00:01.000Z",
    });

    const content = await readFile(filePath, "utf8");
    const lines = content.trim().split("\n");

    expect(lines).toHaveLength(2);

    expect(JSON.parse(lines[0]!)).toEqual({
      type: "run.started",
      runId: "run-123",
      timestamp: "2026-10-02T00:00:00.000Z",
    });

    expect(JSON.parse(lines[1]!)).toEqual({
      type: "run.completed",
      runId: "run-123",
      timestamp: "2026-10-02T00:00:01.000Z",
    });
  });
});

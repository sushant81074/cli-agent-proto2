import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export type TTraceEvent =
  | { type: "run.started"; runId: string; timestamp: string }
  | { type: "model.requested"; runId: string; timestamp: string; model: string }
  | { type: "run.completed"; runId: string; timestamp: string }
  | { type: "run.failed"; runId: string; timestamp: string; error: string }
  | { type: "run.cancelled"; runId: string; timestamp: string }
  | {
      type: "model.completed";
      runId: string;
      timestamp: string;
      model: string;
      inputTokens: number;
      outputTokens: number;
      cacheReadTokens?: number;
      cacheWriteTokens?: number;
      reasoningTokens?: number;
      cost?: number;
      latencyMs: number;
    };

export class JsonlTraceWriter {
  constructor(private readonly filePath: string) {}

  async write(event: TTraceEvent): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await appendFile(this.filePath, `${JSON.stringify(event)}\n`, "utf8");
  }

  async emit(event: TTraceEvent): Promise<void> {
    await this.write(event);
  }
}

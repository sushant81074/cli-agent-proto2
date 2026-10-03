import type { JsonlTraceWriter } from "./jsonl.ts";

type TModelExecution = {
  model: string;
  execute: () => Promise<{
    text: string;
    usage?: {
      inputTokens: number;
      outputTokens: number;
      cacheReadTokens?: number;
      cacheWriteTokens?: number;
      reasoningTokens?: number;
      cost?: number;
    };
    latencyMs: number;
  }>;
};

export async function traceRun(
  runId: string,
  writer: JsonlTraceWriter,
  modelExecution: TModelExecution,
) {
  try {
    await writer.emit({ type: "run.started", runId, timestamp: new Date().toISOString() });
    await writer.emit({
      type: "model.requested",
      runId,
      model: modelExecution.model,
      timestamp: new Date().toISOString(),
    });

    const response = await modelExecution.execute();
    await writer.emit({
      type: "model.completed",
      runId,
      model: modelExecution.model,
      inputTokens: response.usage?.inputTokens ?? 0,
      outputTokens: response.usage?.outputTokens ?? 0,
      latencyMs: response.latencyMs,
      timestamp: new Date().toISOString(),
      ...(response.usage?.cacheReadTokens !== undefined && {
        cacheReadTokens: response.usage.cacheReadTokens,
      }),
      ...(response.usage?.cacheWriteTokens !== undefined && {
        cacheWriteTokens: response.usage.cacheWriteTokens,
      }),
      ...(response.usage?.reasoningTokens !== undefined && {
        reasoningTokens: response.usage.reasoningTokens,
      }),
      ...(response.usage?.cost !== undefined && { cost: response.usage.cost }),
    });
    await writer.emit({ type: "run.completed", runId, timestamp: new Date().toISOString() });

    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      await writer.emit({ type: "run.cancelled", runId, timestamp: new Date().toISOString() });
    } else {
      await writer.emit({
        type: "run.failed",
        runId,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
    throw error;
  }
}

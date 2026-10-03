import { join } from "node:path";
import { newRunId } from "@agentic/core";
import { execute, type ILLMProvider, type TModelRequest } from "@agentic/llm";
import { JsonlTraceWriter, traceRun } from "@agentic/trace";

export async function executeWithTrace(
  provider: ILLMProvider,
  request: TModelRequest,
  fallbackModels: string[],
) {
  const runId = newRunId();
  const tracePath = join(join(process.cwd(), "agentlogs"), `${runId}.jsonl`);

  const writer = new JsonlTraceWriter(tracePath);
  return traceRun(runId, writer, {
    model: request.model,
    execute: () => execute(provider, request, fallbackModels),
  });
}

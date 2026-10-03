import { loadAgentConfig } from "@agentic/cli";
import { createLLM } from "@agentic/llm";

export async function createP01LLM() {
  const config = await loadAgentConfig();
  const apiKey = process.env[config.llm.apiKeyEnv];

  if (!apiKey) {
    throw new Error(`Missing API key: ${config.llm.apiKeyEnv}`);
  }

  return createLLM({
    baseUrl: config.llm.baseUrl,
    apiKey,
    cachePath: "...",
    catalogTtlMs: config.llm.catalogTtlMs,
    retry: config.llm.retry,
  });
}

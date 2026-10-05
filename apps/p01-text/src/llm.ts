import { loadAgentConfig, type AppContext } from "@agentic/cli";
import { createLLM, type ILLMProvider, type TMessage, type TModelRequest, type TUsage } from "@agentic/llm";

export type TCallHooks = {
  onReasoning?: (text: string) => void;
  onDelta?: (text: string) => void;
  onInfo?: (info: string) => void;
  onUsage?: (usage: TUsage) => void;
};

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

export async function executeLLMCall(provider: ILLMProvider, request: TModelRequest, messages: TMessage[], hooks: TCallHooks = {}): Promise<string> {
  let text = "";
  request = { ...request, messages: [...messages] };

  for await (const event of provider.complete(request)) {
    switch (event.type) {
      case "reasoning.delta":
        hooks.onReasoning?.(event.text);
        break;
      case "text.delta":
        text += event.text;
        hooks.onDelta?.(event.text);
        break;
      case "usage":
        hooks.onUsage?.(event.usage);
        break;
      case "error":
        throw event.error;
    }
  }

  request.signal.throwIfAborted();
  return text;
}

export const buildBaseRequest = async (ctx: AppContext) => {

  const config = await loadAgentConfig();
  const routing = config.llm.routing;

  const reqOptionals = {
    ...(routing.sort !== undefined ? { sort: routing.sort } : {}),
    ...(routing.order !== undefined ? { order: routing.order } : {}),
    ...(routing.only !== undefined ? { only: routing.only } : {}),
    ...(routing.ignore !== undefined ? { ignore: routing.ignore } : {}),
    ...(routing.zdr !== undefined ? { zdr: routing.zdr } : {}),
    ...(routing.maxPrice !== undefined ? { maxPrice: routing.maxPrice } : {}),
  };


  const request: TModelRequest = {
    model: config.llm.models.fast,
    messages: [],
    maxTokens: config.llm.maxTokens,
    provider: {
      allowFallbacks: routing.allowFallbacks,
      requireParameters: routing.requireParameters,
      dataCollection: routing.dataCollection,
      ...reqOptionals,
    },
    signal: ctx.signal,
  };

  return request;
};

export const toMessages = (system: string, user: string): TMessage[] => [
  { role: "system", content: [{ type: "text", text: system }] },
  { role: "user", content: [{ type: "text", text: user }] },
];
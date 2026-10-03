import { tr } from "zod/v4/locales/index.js";
import { isRetryableStatus, LLMError } from "../errors.ts";
import { retry } from "../retry.ts";
import { parseSSE } from "../sse.ts";
import type {
  ILLMProvider,
  TMessage,
  TModelRequest,
  TStopReason,
  TStreamEvent,
  TUsage,
} from "../types.ts";

type TOpenRouterRequestBody = {
  model: string;
  messages: Array<{
    role: TMessage["role"];
    content: string;
  }>;
  max_tokens?: number | undefined;
  temperature?: number | undefined;
  stream: true;
  provider?: {
    sort?: string | undefined;
    order?: string[] | undefined;
    only?: string[] | undefined;
    ignore?: string[] | undefined;
    allow_fallbacks?: boolean | undefined;
    require_parameters?: boolean | undefined;
    data_collection?: "allow" | "deny" | undefined;
    zdr?: boolean | undefined;
    max_price?: number | undefined;
  } | undefined;
};

type TOpenRouterChunk = {
  choices?: Array<{
    delta?: {
      content?: string;
      reasoning?: string;
    };
    finish_reason?: string | null;
  }>;
  usage?: TOpenRouterUsage;
  error?: {
    message?: string;
    code?: number | string;
    type?: string;
  };
};

type TOpenRouterUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  cost?: number;
  prompt_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number; };
  completion_tokens_details?: { reasoning_tokens?: number; };
};

function normalizeUsage(u: TOpenRouterUsage): TUsage {
  const cacheRead = u.prompt_tokens_details?.cached_tokens ?? 0;
  const cacheWrite = u.prompt_tokens_details?.cache_write_tokens ?? 0;
  return {
    inputTokens: Math.max(0, (u.prompt_tokens ?? 0) - cacheRead - cacheWrite),
    outputTokens: u.completion_tokens ?? 0,
    cacheReadTokens: cacheRead,
    cacheWriteTokens: cacheWrite,
    reasoningTokens: u.completion_tokens_details?.reasoning_tokens ?? 0,
    ...(u.cost !== undefined ? { cost: u.cost } : {}),
  };
}

export class OpenRouterProvider implements ILLMProvider {
  constructor(
    private apiKey: string,
    private baseUrl: string,
    private readonly retryOptions: {
      maxAttempts: number;
      baseDelayMs: number;
      maxDelayMs: number;
    },
  ) { }

  complete(request: TModelRequest): AsyncIterable<TStreamEvent> {
    return this.stream(request);
  }

  private async *stream(request: TModelRequest): AsyncGenerator<TStreamEvent> {
    const response = await retry(
      async () => {
        const resp = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(this.buildRequestBody(request)),
          signal: request.signal,
        });

        if (!resp.ok) {
          const errorText = await resp.text();
          const retryAfter = resp.headers.get("retry-after");
          const retryAfterMs = retryAfter ? Number(retryAfter) * 1000 : undefined;

          throw new LLMError(
            `OpenRouter API request failed: ${errorText}`,
            resp.status,
            isRetryableStatus(resp.status),
            retryAfterMs,
          );
        }

        return resp;
      },
      { ...this.retryOptions, signal: request.signal },
    );

    let stopReason: TStopReason = "end_turn";
    let hasDoneYeilded = false;
    for await (const chunk of parseSSE(response.body!, request.signal)) {
      if (chunk === "[DONE]") {
        hasDoneYeilded = true;
        yield { type: "done", stopReason };
        return;
      }

      const parsed: TOpenRouterChunk = JSON.parse(chunk) || {};
      if (parsed.error) {
        const code = parsed.error.code;
        throw new LLMError(
          `OpenRouter stream error: ${parsed.error.message ?? "unknown error"}`,
          typeof code === "number" ? code : undefined,
          typeof code === "number" ? isRetryableStatus(code) : true,
        );
      }

      const choice = parsed.choices?.[0];

      if (choice?.delta?.content) yield { type: "text.delta", text: choice.delta.content };
      if (choice?.delta?.reasoning) yield { type: "reasoning.delta", text: choice.delta.reasoning };
      if (parsed.usage) yield { type: "usage", usage: normalizeUsage(parsed.usage) };
      if (choice?.finish_reason) stopReason = this.mapStopReason(choice.finish_reason);

    }

    // No [DONE]: either we were cancelled, or the response is incomplete.
    request.signal.throwIfAborted();
    if (!hasDoneYeilded) throw new LLMError("OpenRouter stream ended before [DONE]", undefined, true);
  }

  private buildRequestBody(request: TModelRequest): TOpenRouterRequestBody {
    const messages = request.messages.map((message) => ({
      role: message.role,
      content: message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join(""),
    }));

    return {
      model: request.model,
      messages,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      stream: true,
      provider: request.provider
        ? {
          sort: request.provider.sort,
          order: request.provider.order,
          only: request.provider.only,
          ignore: request.provider.ignore,
          allow_fallbacks: request.provider.allowFallbacks,
          require_parameters: request.provider.requireParameters,
          data_collection: request.provider.dataCollection,
          zdr: request.provider.zdr,
          max_price: request.provider.maxPrice,
        }
        : undefined,
    };
  }

  private mapStopReason(reason: string): TStopReason {
    switch (reason) {
      case "tool_calls": return "tool_use";
      case "length": return "max_tokens";
      case "content_filter": return "content_filter";
      case "stop": return "end_turn";
      default: return "error";
    }
  }
}

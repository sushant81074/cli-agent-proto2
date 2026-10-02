import { isRetryableStatus, LLMError } from "../errors.ts";
import { retry } from "../retry.ts";
import { parseSSE } from "../sse.ts";
import type { ILLMProvider, TMessage, TModelRequest, TStopReason, TStreamEvent } from "../types.ts";

type TOpenRouterRequestBody = {
  model: string;
  messages: Array<{
    role: TMessage["role"];
    content: string;
  }>;
  max_tokens?: number | undefined;
  temperature?: number | undefined;
  stream: true;
  provider?:
    | {
        sort?: string | undefined;
        order?: string[] | undefined;
        only?: string[] | undefined;
        ignore?: string[] | undefined;
        allow_fallbacks?: boolean | undefined;
        require_parameters?: boolean | undefined;
        data_collection?: "allow" | "deny" | undefined;
        zdr?: boolean | undefined;
        max_price?: number | undefined;
      }
    | undefined;
};

type TOpenRouterChunk = {
  choices?: Array<{
    delta?: {
      content?: string;
      reasoning?: string;
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    cost?: number;
  };
  error?: {
    message?: string;
    code?: number;
    type?: string;
  };
};

export class OpenRouterProvider implements ILLMProvider {
  constructor(
    private apiKey: string,
    private baseUrl: string,
    private readonly retryOptions: {
      maxAttempts: number;
      baseDelayMs: number;
      maxDelayMs: number;
    },
  ) {}

  complete(request: TModelRequest): AsyncIterable<TStreamEvent> {
    return this.stream(request);
  }

  private async *stream(request: TModelRequest): AsyncGenerator<TStreamEvent> {
    const response = await retry(
      () =>
        fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(this.buildRequestBody(request)),
          signal: request.signal,
        }).then(async (response) => {
          if (!response.ok) {
            const errorText = await response.text();
            const retryAfter = response.headers.get("retry-after");
            const retryAfterMs = retryAfter ? Number(retryAfter) * 1000 : undefined;

            throw new LLMError(
              `OpenRouter API request failed: ${errorText}`,
              response.status,
              isRetryableStatus(response.status),
              retryAfterMs,
            );
          }
          return response;
        }),
      { ...this.retryOptions, signal: request.signal },
    );

    for await (const chunk of parseSSE(response.body!, request.signal)) {
      if (chunk === "[DONE]") {
        yield { type: "done", stopReason: "end_turn" };
        return;
      }
      const parsed: TOpenRouterChunk = JSON.parse(chunk) || {};
      const choice = parsed.choices?.[0];

      if (choice?.delta?.content) {
        yield { type: "text.delta", text: choice.delta.content };
      }

      if (choice?.delta?.reasoning) {
        yield { type: "reasoning.delta", text: choice.delta.reasoning };
      }

      if (parsed.usage) {
        yield {
          type: "usage",
          usage: {
            inputTokens: parsed.usage.prompt_tokens ?? 0,
            outputTokens: parsed.usage.completion_tokens ?? 0,
            ...(parsed.usage.cost !== undefined ? { cost: parsed.usage.cost } : {}),
          },
        };
      }

      if (choice?.finish_reason) {
        const stopReason = this.mapStopReason(choice.finish_reason);
        yield { type: "done", stopReason };
        return;
      }
    }
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
      case "tool_calls":
        return "tool_use";
      case "length":
        return "max_tokens";
      case "content_filter":
        return "content_filter";
      case "stop":
        return "end_turn";
      default:
        return "error";
    }
  }
}

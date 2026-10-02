export type TContentBlock =
    | { type: "text"; text: string; }
    | { type: "reasoning"; text: string; }
    | { type: "tool_use"; id: string; name: string; input: unknown; }
    | { type: "tool_result"; toolUseId: string; content: string; isError?: boolean; };

export type TStopReason = "end_turn" | "tool_use" | "max_tokens" | "content_filter" | "error";

export type TStreamEvent =
    | { type: "text.delta"; text: string; }
    | { type: "reasoning.delta"; text: string; }
    | { type: "usage"; usage: TUsage; }
    | { type: "done"; stopReason: TStopReason; }
    | { type: "error"; error: Error; };

export type TMessage = {
    role: "system" | "user" | "assistant";
    content: TContentBlock[];
};

export type TProviderRouting = {
    sort?: string;
    order?: string[];
    only?: string[];
    ignore?: string[];
    allowFallbacks?: boolean;
    requireParameters?: boolean;
    dataCollection?: "allow" | "deny";
    zdr?: boolean;
    maxPrice?: number;
};

export type TModelRequest = {
    model: string;
    messages: TMessage[];
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
    provider?: TProviderRouting;
    signal: AbortSignal;
};

export type TUsage = {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
    reasoningTokens?: number;
    cost?: number;
};

export interface ILLMProvider {
    complete(
        request: TModelRequest,
    ): AsyncIterable<TStreamEvent>;
}
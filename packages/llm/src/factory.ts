import type { TProviderRouting } from "./types.ts";
import { ModelCatalog } from "./catalog.ts";
import { OpenRouterProvider } from "./providers/openrouter.ts";

export type TLLMFactoryConfig = {
    baseUrl: string;
    apiKey: string;
    cachePath: string;
    catalogTtlMs: number;
    retry: {
        maxAttempts: number;
        baseDelayMs: number;
        maxDelayMs: number;
    };
};

export type TLLM = {
    provider: OpenRouterProvider;
    catalog: ModelCatalog;
};

export function createLLM(config: TLLMFactoryConfig): TLLM {
    const provider = new OpenRouterProvider(
        config.apiKey,
        config.baseUrl,
        config.retry,
    );

    const catalog = new ModelCatalog(
        config.apiKey,
        config.baseUrl,
        config.cachePath,
        config.catalogTtlMs,
    );

    return {
        provider,
        catalog,
    };
}
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type TModelCatalogEntry = {
  id: string;
  contextLength: number;
  maxCompletionTokens?: number;
  supportedParameters: string[];
  inputModalities: string[];
  outputModalities: string[];
  pricing: {
    prompt: number;
    completion: number;
  };
};

type TModelCatalogCache = {
  fetchedAt: number;
  models: TModelCatalogEntry[];
};

type TOpenRouterModel = {
  id: string;
  context_length: number;
  max_completion_tokens?: number;
  supported_parameters?: string[];
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
  pricing?: {
    prompt?: string;
    completion?: string;
  };
};

type TOpenRouterModelsResponse = {
  data: TOpenRouterModel[];
};

export class ModelCatalog {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly cachePath: string,
    private readonly ttlMs: number,
  ) {}

  async getModel(modelId: string, signal?: AbortSignal): Promise<TModelCatalogEntry | undefined> {
    const models = await this.getModels(signal);
    return models.find((model) => model.id === modelId);
  }

  async getModels(signal?: AbortSignal, refresh = false): Promise<TModelCatalogEntry[]> {
    if (!refresh) {
      try {
        const cached = JSON.parse(await readFile(this.cachePath, "utf8")) as TModelCatalogCache;
        if (this.isCacheValid(cached)) return cached.models;
      } catch {
        // Cache missing or invalid — fetch fresh data.
      }
    }

    const response = await fetch(`${this.baseUrl}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      signal: signal!,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const modelsResponse = (await response.json()) as TOpenRouterModelsResponse;
    const models = modelsResponse.data.map((model) => ({
      id: model.id,
      contextLength: model.context_length,
      ...(model.max_completion_tokens !== undefined && {
        maxCompletionTokens: model.max_completion_tokens,
      }),
      supportedParameters: model.supported_parameters || [],
      inputModalities: model.architecture?.input_modalities || [],
      outputModalities: model.architecture?.output_modalities || [],
      pricing: {
        prompt: model.pricing?.prompt ? parseFloat(model.pricing.prompt) : 0,
        completion: model.pricing?.completion ? parseFloat(model.pricing.completion) : 0,
      },
    }));

    const cache: TModelCatalogCache = {
      fetchedAt: Date.now(),
      models,
    };

    await mkdir(dirname(this.cachePath), { recursive: true });

    await writeFile(this.cachePath, JSON.stringify(cache, null, 2), "utf8");

    return models;
  }

  private isCacheValid(cache: TModelCatalogCache): boolean {
    return Date.now() - cache.fetchedAt < this.ttlMs;
  }
}

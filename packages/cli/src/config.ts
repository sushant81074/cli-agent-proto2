import { z } from "zod";

export type TAgenticConfig = z.infer<typeof ConfigSchema>;

const RoutingSchema = z.object({
  sort: z.string().optional(),
  order: z.array(z.string()).optional(),
  only: z.array(z.string()).optional(),
  ignore: z.array(z.string()).optional(),
  allowFallbacks: z.boolean().default(true),
  requireParameters: z.boolean().default(false),
  dataCollection: z.enum(["allow", "deny"]).default("deny"),
  zdr: z.boolean().optional(),
  maxPrice: z.number().optional(),
});

const ModelsSchema = z.object({
  fast: z.string(),
  balanced: z.string(),
  deep: z.string(),
  embed: z.string().optional(),
  rerank: z.string().optional(),
  stt: z.string().optional(),
  tts: z.string().optional(),
});

const RetrySchema = z.object({
  maxAttempts: z.number().default(3),
  baseDelayMs: z.number().default(250),
  maxDelayMs: z.number().default(4_000),
});

const SummarizeSchema = z.object({
  stuffMaxTokens: z.number().default(12_000),
  chunkTokens: z.number().default(6_000),
  overlapTokens: z.number().default(400),
  mapConcurrency: z.number().default(4),
});

export const ConfigSchema = z.object({
  llm: z.object({
    baseUrl: z.string().default("https://openrouter.ai/api/v1"),
    apiKeyEnv: z.string().default(process.env.OPENROUTER_API_KEY || "OPENROUTER_API_KEY"),
    models: ModelsSchema,
    routing: RoutingSchema.default({
      allowFallbacks: true,
      requireParameters: false,
      dataCollection: "deny",
    }),
    fallbackModels: z.array(z.string()).default([]),
    catalogTtlMs: z.number().default(86_400_000),
    maxTokens: z.number().default(4_096),
    retry: RetrySchema.default({
      maxAttempts: 3,
      baseDelayMs: 250,
      maxDelayMs: 4_000,
    }),
  }),

  summarize: SummarizeSchema.default({
    stuffMaxTokens: 12_000,
    chunkTokens: 6_000,
    overlapTokens: 400,
    mapConcurrency: 4,
  }),
});

export const defaultConfig = ConfigSchema.parse({
  llm: {
    models: {
      fast: process.env.FAST_MODEL || "",
      balanced: process.env.BALANCED_MODEL || "",
      deep: process.env.DEEP_MODEL || "",
    },
  },
});

export type TConfigSchema = z.infer<typeof ConfigSchema>;

export const loadAgentConfig = async (): Promise<TAgenticConfig> => {
  const module = await import("../../../.agentic/config.json", {
    with: { type: "json" },
  });
  return ConfigSchema.parse(module.default);
};

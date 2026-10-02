import type { TModelResponse } from "./complete.ts";
import { completeWithFallback } from "./fallback.ts";
import type { ILLMProvider, TModelRequest } from "./types.ts";

export async function execute(
  provider: ILLMProvider,
  request: TModelRequest,
  fallbackModels: string[],
): Promise<TModelResponse> {
  const models = [request.model, ...fallbackModels];

  return completeWithFallback(provider, request, models);
}

import { complete, type TModelResponse } from "./complete.ts";
import { isNetworkError, LLMError } from "./errors.ts";
import type { ILLMProvider, TModelRequest } from "./types.ts";

export async function completeWithFallback(
  provider: ILLMProvider,
  request: TModelRequest,
  models: string[],
): Promise<TModelResponse> {
  let lastError: unknown;

  for (const model of models) {
    try {
      return await complete(provider, { ...request, model });
    } catch (error) {
      if ((!(error instanceof LLMError) || !error.retryable) && !isNetworkError(error)) {
        throw error;
      }

      lastError = error;
    }
  }

  throw lastError;
}

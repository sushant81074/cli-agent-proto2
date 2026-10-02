import { isNetworkError, LLMError } from "./errors.ts";

export type TRetryOptions = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  signal?: AbortSignal;
};

export async function retry<T>(operation: () => Promise<T>, options: TRetryOptions): Promise<T> {
  let attempt = 0;

  while (attempt < options.maxAttempts) {
    attempt += 1;
    try {
      return await operation();
    } catch (error) {
      const retryable = (error instanceof LLMError && error.retryable) || isNetworkError(error);
      if (!retryable || attempt >= options.maxAttempts) throw error;

      const retryAfterMs = error instanceof LLMError ? error.retryAfterMs : undefined;
      const exponentialDelay = Math.min(
        options.baseDelayMs * 2 ** (attempt - 1),
        options.maxDelayMs,
      );
      const jitter = Math.random() * exponentialDelay;
      const waitMs = retryAfterMs ?? jitter;
      await delay(waitMs, options.signal);
    }
  }

  throw new Error("Retry operation exhausted");
}

export async function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }

    const timer = setTimeout(resolve, ms);

    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

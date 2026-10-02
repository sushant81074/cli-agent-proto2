export class LLMError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryable = false,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "LLMError";
  }
}

export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 502;
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError;
}

export async function* parseSSE(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();

  const onAbort = () => void reader.cancel();
  signal?.addEventListener("abort", onAbort, { once: true });

  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) throw new DOMException("The operation was aborted", "AbortError");

      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith(":")) continue;
        if (!trimmed.startsWith("data:")) continue;

        yield trimmed.slice(5).trim();
      }
    }

    buffer += decoder.decode();

    const trimmed = buffer.trim();

    if (trimmed.startsWith("data:")) yield trimmed.slice(5).trim();
  } finally {
    signal?.removeEventListener("abort", onAbort);
    reader.releaseLock();
  }
}

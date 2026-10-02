import { describe, expect, it } from "vitest";
import { LLMError } from "../src/errors.ts";
import { completeWithFallback } from "../src/fallback.ts";
import type { ILLMProvider, TModelRequest, TStreamEvent } from "../src/types.ts";

class TestProvider implements ILLMProvider {
  public readonly models: string[] = [];

  async *complete(request: TModelRequest): AsyncIterable<TStreamEvent> {
    this.models.push(request.model);

    if (request.model === "model-a") {
      yield {
        type: "error",
        error: new LLMError("model-a failed", 502, true),
      };
      return;
    }

    yield {
      type: "text.delta",
      text: "success",
    };

    yield {
      type: "done",
      stopReason: "end_turn",
    };
  }
}

describe("completeWithFallback", () => {
  it("falls back to the next model after failure", async () => {
    const provider = new TestProvider();

    const response = await completeWithFallback(
      provider,
      {
        model: "model-a",
        messages: [],
        signal: new AbortController().signal,
      },
      ["model-a", "model-b"],
    );

    expect(provider.models).toEqual(["model-a", "model-b"]);
    expect(response.text).toBe("success");
  });

  it("throws when every model fails", async () => {
    const provider: ILLMProvider = {
      async *complete(request) {
        yield {
          type: "error",
          error: new LLMError(`${request.model} failed`, 502, true),
        };
      },
    };

    await expect(
      completeWithFallback(
        provider,
        {
          model: "model-a",
          messages: [],
          signal: new AbortController().signal,
        },
        ["model-a", "model-b"],
      ),
    ).rejects.toThrow("model-b failed");
  });
});

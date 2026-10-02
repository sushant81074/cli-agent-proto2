import { describe, expect, it } from "vitest";
import { LLMError } from "../src/errors.ts";
import { execute } from "../src/execute.ts";
import type { ILLMProvider, TModelRequest, TStreamEvent } from "../src/types.ts";

describe("execute", () => {
  it("uses the primary model first and falls back to the next model", async () => {
    const models: string[] = [];

    const provider: ILLMProvider = {
      async *complete(request: TModelRequest): AsyncIterable<TStreamEvent> {
        models.push(request.model);

        if (request.model === "model-a") {
          yield {
            type: "error",
            error: new LLMError("Primary model failed", 502, true),
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
      },
    };

    const request: TModelRequest = {
      model: "model-a",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Hello",
            },
          ],
        },
      ],
      signal: new AbortController().signal,
    };

    const response = await execute(provider, request, ["model-b"]);

    expect(models).toEqual(["model-a", "model-b"]);

    expect(response.text).toBe("success");
    expect(response.stopReason).toBe("end_turn");
  });
});

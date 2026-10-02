import { describe, expect, it } from "vitest";
import { complete } from "../src/complete.ts";
import { ReplayProvider } from "../src/providers/replay.ts";

describe("complete", () => {
  it("folds stream events into a model response", async () => {
    const provider = new ReplayProvider([
      {
        type: "text.delta",
        text: "Hello ",
      },
      {
        type: "text.delta",
        text: "world",
      },
      {
        type: "reasoning.delta",
        text: "thinking",
      },
      {
        type: "usage",
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          cost: 0.01,
        },
      },
      {
        type: "done",
        stopReason: "end_turn",
      },
    ]);

    const response = await complete(provider, {
      model: "test/model",
      messages: [],
      signal: new AbortController().signal,
    });

    expect(response.text).toBe("Hello world");
    expect(response.reasoning).toBe("thinking");
    expect(response.usage).toEqual({
      inputTokens: 10,
      outputTokens: 5,
      cost: 0.01,
    });
    expect(response.stopReason).toBe("end_turn");
    expect(response.latencyMs).toBeGreaterThanOrEqual(0);
  });
  it("propagates stream errors", async () => {
    const provider = new ReplayProvider([
      {
        type: "error",
        error: new Error("stream failed"),
      },
    ]);

    await expect(
      complete(provider, {
        model: "test/model",
        messages: [],
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow("stream failed");

    const events = [];

    for await (const event of provider.complete({
      model: "test/model",
      messages: [],
      signal: new AbortController().signal,
    })) {
      events.push(event);
    }
    expect(events[0]?.type).toBe("error");
  });
});

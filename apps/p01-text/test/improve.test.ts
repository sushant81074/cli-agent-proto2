import { describe, expect, it, vi } from "vitest";
import type { ILLMProvider, TModelRequest, TMessage } from "@agentic/llm";
import { improvePrompt } from "../src/improve.ts";
import { OutputValidationError } from "../src/error.ts";

// Helper function to build standard base requests for testing
function createBaseRequest(messages: TMessage[]): TModelRequest {
    return {
        model: "test-model",
        messages,
        maxTokens: 1000,
        provider: { allowFallbacks: false, requireParameters: false, dataCollection: "deny" },
        signal: new AbortController().signal,
    };
}

describe("Automated Repair Loop System", () => {
    it("should successfully heal structural issues on the second execution call", async () => {
        const requestedPayloads: TMessage[][] = [];

        const fakeProvider = {
            complete: vi.fn().mockImplementation(async function* (req: TModelRequest) {
                requestedPayloads.push(req.messages);

                if (requestedPayloads.length === 1) {
                    // Turn 1 returns invalid syntax or shape
                    yield { type: "text.delta", text: '{"improvedPrompt": "Raw data string", "changes": "Broken raw text string context"}' };
                } else {
                    // Turn 2 returns fully valid schema compliance
                    yield {
                        type: "text.delta",
                        text: '{"improvedPrompt": "Valid engineered prompt text", "changes": ["fixed description"], "assumptions": [], "openQuestions": []}'
                    };
                }
            })
        } as unknown as ILLMProvider;

        const result = await improvePrompt(fakeProvider, createBaseRequest([{ role: "user", content: [{ type: "text", text: "Task details" }] }]));

        expect(result.improvedPrompt).toBe("Valid engineered prompt text");
        expect(fakeProvider.complete).toHaveBeenCalledTimes(2);

        // Assert alignment of tracking array conversation turns
        const finalCallHistory = requestedPayloads[1]!;
        expect(finalCallHistory[finalCallHistory.length - 2]?.role).toBe("assistant");
        expect(finalCallHistory[finalCallHistory.length - 1]?.role).toBe("user");
        const repairBlock = finalCallHistory[finalCallHistory.length - 1]?.content[0];
        if (repairBlock?.type !== "text") {
            throw new Error("Expected the repair message to contain a text block");
        }
        expect(repairBlock.text).toContain("Your response failed validation");
    });

    it("should enforce execution budget limits and throw OutputValidationError if both turns fail", async () => {
        const fakeProvider = {
            complete: vi.fn().mockImplementation(async function* () {
                // Repeatedly emit invalid structural content blocks
                yield { type: "text.delta", text: "Garbage data structure" };
            })
        } as unknown as ILLMProvider;

        await expect(
            improvePrompt(fakeProvider, createBaseRequest([{ role: "user", content: [{ type: "text", text: "Adversarial entry" }] }]))
        ).rejects.toThrow(OutputValidationError);

        // Guarantee transaction boundary limits never run out of control
        expect(fakeProvider.complete).toHaveBeenCalledTimes(2);
    });
});

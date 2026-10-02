import { describe, expect, it } from "vitest";
import { LLMError } from "../src/errors.ts";
import { retry } from "../src/retry.ts";

describe("retry", () => {
    it("retries a retryable error and eventually succeeds", async () => {
        let attempts = 0;

        const result = await retry(
            async () => {
                attempts += 1;

                if (attempts < 3) {
                    throw new LLMError(
                        "temporary failure",
                        502,
                        true,
                    );
                }

                return "success";
            },
            {
                maxAttempts: 3,
                baseDelayMs: 0,
                maxDelayMs: 0,
            },
        );

        expect(result).toBe("success");
        expect(attempts).toBe(3);
    });
    it("does not retry a non-retryable error", async () => {
        let attempts = 0;

        await expect(
            retry(
                async () => {
                    attempts += 1;

                    throw new LLMError(
                        "unauthorized",
                        401,
                        false,
                    );
                },
                {
                    maxAttempts: 3,
                    baseDelayMs: 0,
                    maxDelayMs: 0,
                },
            ),
        ).rejects.toThrow("unauthorized");

        expect(attempts).toBe(1);
    });
    it("retries network errors", async () => {
        let attempts = 0;

        const result = await retry(
            async () => {
                attempts += 1;

                if (attempts < 3) {
                    throw new TypeError("network failure");
                }

                return "success";
            },
            {
                maxAttempts: 3,
                baseDelayMs: 0,
                maxDelayMs: 0,
            },
        );

        expect(result).toBe("success");
        expect(attempts).toBe(3);
    });
    it("stops retrying when aborted", async () => {
        const controller = new AbortController();
        let attempts = 0;

        const promise = retry(
            async () => {
                attempts += 1;

                throw new LLMError(
                    "temporary failure",
                    502,
                    true,
                );
            },
            {
                maxAttempts: 3,
                baseDelayMs: 10_000,
                maxDelayMs: 10_000,
                signal: controller.signal,
            },
        );

        controller.abort();

        await expect(promise).rejects.toBeDefined();

        expect(attempts).toBe(1);
    });
    it("uses retry-after when provided", async () => {
        let attempts = 0;
        const start = Date.now();

        const result = await retry(
            async () => {
                attempts += 1;

                if (attempts === 1) {
                    throw new LLMError(
                        "rate limited",
                        429,
                        true,
                        20,
                    );
                }

                return "success";
            },
            {
                maxAttempts: 2,
                baseDelayMs: 0,
                maxDelayMs: 0,
            },
        );

        const elapsed = Date.now() - start;

        expect(result).toBe("success");
        expect(attempts).toBe(2);
        expect(elapsed).toBeGreaterThanOrEqual(20);
    });
});
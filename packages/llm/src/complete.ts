import type { TModelRequest, TStopReason, TUsage } from "./types.ts";

export type TModelResponse = {
    text: string;
    reasoning?: string;
    usage?: TUsage;
    stopReason: TStopReason;
    latencyMs: number;
};

import type { ILLMProvider } from "./types.ts";

export async function complete(provider: ILLMProvider, request: TModelRequest): Promise<TModelResponse> {
    let [text, reasoning, usage, stopReason, latencyMs]:
        [string, string, TUsage | undefined, TStopReason, number]
        = ["", "", undefined, "error", Date.now()];

    for await (const event of provider.complete(request)) {

        switch (event.type) {
            case "text.delta":
                text += event.text;
                break;
            case "reasoning.delta":
                reasoning += event.text;
                break;
            case "usage":
                usage = event.usage;
                break;
            case "done":
                stopReason = event.stopReason;
                break;
            case "error":
                throw event.error;
        }

    }

    return {
        text,
        reasoning,
        usage: usage as TUsage,
        stopReason,
        latencyMs: Date.now() - latencyMs,
    };
}
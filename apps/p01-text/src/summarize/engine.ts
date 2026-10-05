import type { TOutput } from "@agentic/cli";
import type { ILLMProvider, TModelRequest } from "@agentic/llm";
import { chunkText, estimateTokens } from "./chunker.ts";
import { executeLLMCall, toMessages, type TCallHooks } from "../llm.ts";
import { mapWithConcurrency } from "./concurrency.ts";
import { renderTemplate } from "../prompts.ts";

export type TSummarizeConfig = {
    stuffMaxTokens: number;
    chunkTokens: number;
    overlapTokens: number;
    mapConcurrency: number;
};

export type TSummarizeDeps = {
    provider: ILLMProvider;
    request: TModelRequest;
    cfg: TSummarizeConfig;
    output: TOutput;                // from @agentic/cli: stream, info, reasoning
};

export type TTotals = { inputTokens: number; outputTokens: number; cost: number; calls: number; };

export type TSummarizeResult = {
    summary: string;
    strategy: "stuff" | "map-reduce";
    chunks: number;
    inputTokensEstimate: number;
    totals: TTotals;
};


export async function summarizeText(txt: string, deps: TSummarizeDeps): Promise<TSummarizeResult> {
    const { request, cfg, output, provider } = deps;
    const totals = { inputTokens: 0, outputTokens: 0, cost: 0, calls: 0 };

    const estimate = estimateTokens(txt);

    const [system, user] = [
        renderTemplate("summarize.v1.system"),
        renderTemplate("summarize.v1.user", { document: txt }),
    ];


    const call = async (request: TModelRequest, user: string, hooks: TCallHooks = {}) => {
        totals.calls += 1;
        return executeLLMCall(provider, request, toMessages(system, user), {
            ...hooks,
            onUsage: (u) => {
                totals.inputTokens += u.inputTokens;
                totals.outputTokens += u.outputTokens;
                totals.cost += u.cost ?? 0;
            },
        });
    };

    const streamHooks = {
        onDelta: (delta: string) => process.stdout.write(delta),
        onReasoning: (reason: string) => process.stdout.write(reason)
    };

    if (estimate <= cfg.stuffMaxTokens) {
        const summary = await call(request, user, streamHooks);
        return {
            summary,
            strategy: "stuff",
            chunks: 1,
            inputTokensEstimate: estimate,
            totals
        };
    }

    const chunks = chunkText(txt, cfg.chunkTokens, cfg.overlapTokens);
    output.info(`Document ~${estimate} tokens → ${chunks.length} chunks`);

    let done = 0;
    let summaries = await mapWithConcurrency(chunks, cfg.mapConcurrency, async (chunk: string, i: number) => {
        const summary = await call(
            request,
            renderTemplate("summarize-chunk.v1", {
                index: String(i + 1),
                total: String(chunks.length),
                chunk,
            }),
            streamHooks
        );
        done += 1;
        output.info(`chunk ${done}/${chunks.length} done`);
        return summary;
    });

    while (estimateTokens(summaries.join("\n\n")) > cfg.stuffMaxTokens) {
        const groups = packIntoGroups(summaries, cfg.stuffMaxTokens);
        if (groups.length >= summaries.length) break;

        output.info(`reducing ${summaries.length} summaries → ${groups.length}`);

        summaries = await mapWithConcurrency(groups, cfg.mapConcurrency,
            (group: string[]) => call(
                request,
                renderTemplate("summarize-reduce.v1", { summaries: numbered(group) }),
                streamHooks
            )
        );
    }

    const summary = await call(
        request,
        renderTemplate("summarize-reduce.v1", { summaries: numbered(summaries) }),
        streamHooks
    );

    return { summary, strategy: "map-reduce", chunks: chunks.length, inputTokensEstimate: estimate, totals };

}

function numbered(summaries: string[]): string {
    return summaries.map((s, i) => `[Part ${i + 1}]\n${s}`).join("\n\n");
}

function packIntoGroups(summaries: string[], budget: number): string[][] {
    const groups: string[][] = [];
    let current: string[] = [];
    for (const s of summaries) {
        if (current.length > 0 && estimateTokens([...current, s].join("\n\n")) > budget) {
            groups.push(current);
            current = [];
        }
        current.push(s);
    }
    if (current.length > 0) groups.push(current);
    return groups;
}
import { readFile } from "node:fs/promises";
import type { Command } from "commander";
import { createOutput, loadAgentConfig, type AppContext } from "@agentic/cli";
import type { ILLMProvider, TModelRequest } from "@agentic/llm";
import { renderTemplate } from "../prompts.ts";
import { buildBaseRequest, createP01LLM, toMessages, type TCallHooks } from "../llm.ts";
import { summarizeText, type TSummarizeResult } from "../summarize/engine.ts";

type TSummarizeOptions = {
    json?: boolean;
    showReasoning?: boolean;
};

const readStdin = async () => {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString("utf-8");
};

const fmt = (n: number): string => n.toLocaleString("en-US");

const footer = (r: TSummarizeResult, seconds: number): string =>
    [
        r.strategy,
        `${r.chunks} chunk${r.chunks === 1 ? "" : "s"}`,
        `${r.totals.calls} call${r.totals.calls === 1 ? "" : "s"}`,
        `${fmt(r.totals.inputTokens)} in / ${fmt(r.totals.outputTokens)} out`,
        `$${r.totals.cost.toFixed(4)}`,
        `${seconds.toFixed(1)} s`,
    ].join(" · ");

export const registerSummarizeCommand = (program: Command, ctx: AppContext) => {
    const text = program.command("text").description("Text operations");

    text
        .command("summarize <file>")
        .description("Summarize a document of any length (use - to read stdin)")
        .option("--json", "Output JSON")
        .option("--show-reasoning", "Stream the model's reasoning to stderr")
        .action(async (file: string, options: TSummarizeOptions, cmd: Command) => {

            const output = createOutput({
                mode: options.json ? "json" : "human",
                showReasoning: options.showReasoning ?? false,
            });

            let txt = "";
            if (file === "-") {
                try { txt = await readStdin(); }
                catch (error) { cmd.error(`Error reading input buffer from stdin stream channel: ${(error as Error).message}`); }
            } else {
                try { txt = await readFile(file, "utf-8"); }
                catch (error) { cmd.error(`Error reading file at location target ${file}: ${(error as Error).message}`); }
            }

            if (!txt.trim()) {
                cmd.outputHelp();
                process.exitCode = 2;
                return;
            }

            const llm = await createP01LLM();
            const request = await buildBaseRequest(ctx);
            const config = await loadAgentConfig();

            const started = Date.now();
            const result = await summarizeText(txt, {
                provider: llm.provider,
                request,
                cfg: config.summarize,
                output,
            });
            const seconds = (Date.now() - started) / 1000;

            if (options.json) {
                output.result({ ...result, latencySeconds: seconds }, () => "");
            } else {
                output.info("");
                output.info(footer(result, seconds));
            }

        });
};
import { readFile } from "node:fs/promises";
import { type AppContext, createOutput, loadAgentConfig } from "@agentic/cli";
import type { TModelRequest } from "@agentic/llm";
import type { Command } from "commander";
import { improvePrompt } from "../improve.ts";
import { createP01LLM } from "../llm.ts";
import { renderTemplate } from "../prompts.ts";
import type { TPromptImprove } from "../schemas/prompt-improve.ts";

type PromptImproveOptions = {
  goal?: string;
  audience?: string;
  file?: string;
  json?: boolean;
  showReasoning?: boolean;
};

const toHuman = (r: TPromptImprove): string => {
  const parts = ["\n\n", "Improved prompt:", "", r.improvedPrompt, ""];

  if (r.changes.length > 0) parts.push("Changes:", ...r.changes.map((c) => `- ${c}`), "");
  if (r.assumptions.length > 0)
    parts.push("Assumptions made:", ...r.assumptions.map((a) => `- ${a}`), "");
  if (r.openQuestions.length > 0)
    parts.push("Open questions for you:", ...r.openQuestions.map((q) => `- ${q}`), "");

  return parts.join("\n").trim();
};

export const registerPromptImproveCommand = (program: Command, ctx: AppContext): void => {
  const prompt = program.command("prompt").description("Prompt operations");

  prompt
    .command("improve [draft]")
    .description("Turn a rough prompt into a precise one")
    .option("--goal <goal>", "Goal of the prompt")
    .option("--audience <audience>", "Target audience")
    .option("--file <path>", "Read the draft prompt from a file")
    .option("--json", "Output JSON")
    .option("--show-reasoning", "Stream the model's reasoning to stderr")
    .action(async (draft: string, options: PromptImproveOptions, cmd: Command) => {
      const output = createOutput({
        mode: options.json ? "json" : "human",
        showReasoning: options.showReasoning ?? false,
      });

      let draftContent = draft ?? "";
      if (options.file) {
        try {
          draftContent = await readFile(options.file, "utf-8");
        } catch (error) {
          cmd.error(`Error reading file at ${options.file}: ${(error as Error).message}`);
        }
      }

      // if (!draftContent.trim() && !options.goal) {
      //   cmd.error("Error: Please provide a draft prompt or specify a --goal.");
      // }

      if (!draftContent.trim() && !options.goal) {
        cmd.outputHelp();
        process.exitCode = 2;
        return;
      }

      const config = await loadAgentConfig();
      const llm = await createP01LLM();
      const routing = config.llm.routing;

      const reqOptionals = {
        ...(routing.sort !== undefined ? { sort: routing.sort } : {}),
        ...(routing.order !== undefined ? { order: routing.order } : {}),
        ...(routing.only !== undefined ? { only: routing.only } : {}),
        ...(routing.ignore !== undefined ? { ignore: routing.ignore } : {}),
        ...(routing.zdr !== undefined ? { zdr: routing.zdr } : {}),
        ...(routing.maxPrice !== undefined ? { maxPrice: routing.maxPrice } : {}),
      };

      const systemPrompt = renderTemplate("improve-prompt.v1.system");
      const userPrompt = renderTemplate("improve-prompt.v1.user", {
        draft: draftContent.trim() || "(not specified)",
        goal: options.goal ?? "(not specified)",
        audience: options.audience ?? "(not specified)",
      });

      const request: TModelRequest = {
        model: config.llm.models.fast,
        messages: [
          {
            role: "system",
            content: [{ type: "text", text: systemPrompt }],
          },
          {
            role: "user",
            content: [{ type: "text", text: userPrompt }],
          },
        ],
        maxTokens: config.llm.maxTokens,
        provider: {
          allowFallbacks: routing.allowFallbacks,
          requireParameters: routing.requireParameters,
          dataCollection: routing.dataCollection,
          ...reqOptionals,
        },
        signal: ctx.signal,
      };

      const result = await improvePrompt(llm.provider, request, {
        onReasoning: (text) => output.reasoning(text),
        onDelta: (text) => process.stdout.write(text),
      });

      output.result(result, toHuman);
    });
};

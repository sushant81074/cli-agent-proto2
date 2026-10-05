import type { AppContext } from "@agentic/cli";
import type { Command } from "commander";
import { registerPromptImproveCommand } from "./commands/prompt-improve.ts";
import { registerSummarizeCommand } from "./commands/text-summarize.ts";

export const register = (program: Command, abort: AppContext) => {
  registerPromptImproveCommand(program, abort);
  registerSummarizeCommand(program, abort);
};

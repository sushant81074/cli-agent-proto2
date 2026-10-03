import { type Command, CommanderError } from "commander";
import type { AppContext } from "./context.ts";
import { ExitCode } from "./exit.ts";
import { logger } from "./logger.ts";

export const runProgram = async (program: Command, ctx: AppContext) => {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if (ctx.signal.aborted) {
      logger.warn("Run cancelled by user");
      process.exitCode = ExitCode.Interrupted;
    } else if (error instanceof CommanderError) {
      process.exitCode = error.exitCode === 0 ? ExitCode.Success : ExitCode.UsageError;
      return;
    } else {
      logger.error({ err: error }, "CLI command failed");
      if (error && typeof error === "object" && "exitCode" in error) {
        process.exitCode = Number(error.exitCode);
      } else {
        process.exitCode = ExitCode.RuntimeFailure;
      }
      return;
    }
  }
};

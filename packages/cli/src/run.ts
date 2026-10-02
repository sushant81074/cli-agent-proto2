import { type Command, CommanderError } from "commander";
import { ExitCode } from "./exit.ts";
import { logger } from "./logger.ts";

export const runProgram = async (program: Command) => {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof CommanderError) {
      process.exitCode = error.exitCode === 0 ? ExitCode.Success : ExitCode.UsageError;
      return;
    }
    logger.error({ err: error }, "CLI command failed");
    process.exitCode = ExitCode.RuntimeFailure;
  }
};

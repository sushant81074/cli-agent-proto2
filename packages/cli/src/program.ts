import { Command } from "commander";
import { registerConfigCommand } from "./commands/configRegistry.ts";

export const createProgram = () => {
    const program = new Command("agent").description("Agent Cli").exitOverride();;
    registerConfigCommand(program);
    return program;
};
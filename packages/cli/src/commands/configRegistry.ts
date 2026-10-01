import { Command } from "commander";
import { loadAgentConfig } from "../config.ts";

export const registerConfigCommand = (program: Command) => {
    const config = program.command("config").description("Manage Agent configuration");
    config
        .command("show")
        .description("Show resolved configuration")
        .option("--json", "Output JSON")
        .action(async (options: { json?: boolean; }) => {
            const config = await loadAgentConfig();
            if (options.json) {
                console.log(JSON.stringify(config));
            } else {
                console.log(config);
            }
        });
};
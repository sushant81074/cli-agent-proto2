#!/usr/bin/env node

import { type AppContext, createAbortController, createProgram, runProgram } from "@agentic/cli";
import { register as registerP01 } from "@agentic/p01-text";

const abort = createAbortController();
const ctx: AppContext = { signal: abort.signal };
const program = createProgram();

registerP01(program, ctx);

await runProgram(program, ctx);

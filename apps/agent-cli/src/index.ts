#!/usr/bin/env node
// The `agent` binary. From P1 on, each project app exports register(program) and is mounted here.

import { createAbortController, createProgram, runProgram } from "@agentic/cli";

createAbortController();
await runProgram(createProgram());

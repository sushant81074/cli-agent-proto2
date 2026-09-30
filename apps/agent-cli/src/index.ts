#!/usr/bin/env node
// The `agent` binary. From P1 on, each project app exports register(program) and is mounted here.
import { packageName } from '@agentic/core';

process.stdout.write(
  `agent: workspace OK · linked ${packageName} · Node ${process.versions.node}\n`,
);

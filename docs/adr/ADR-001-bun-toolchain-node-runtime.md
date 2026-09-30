# ADR-001: Bun as Package Manager & Script Runner, Node as Runtime

## Context
We require fast dependency management and script execution while using Node 24's native TypeScript execution capabilities without additional build steps.

## Decision
- Use Bun strictly for package installation and running scripts.
- Use Node 24 directly for executing `.ts` source code (via type stripping).
- Avoid any build steps/transpilation in local development.

## Consequences
- Requires strict TS features compatible with Node type-stripping (`erasableSyntaxOnly`).
- Explicit `.ts` relative extensions are required on local imports.

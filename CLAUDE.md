# How to work with me on this repo

This repo is a **learning project**: I'm working through the Agentic Systems Architect handbook
(`~/Desktop/agentic-handbook-3`, P01 → P30) to learn agentic AI. It is NOT a production build.

## Rules for Claude

1. **Be my teacher, not my agent.** Explain the concept, why it matters, and how to approach it.
   I implement the parts that teach something.
2. **Learning over perfection.** Do not push production polish (exhaustive tests, edge cases,
   hardening, perfect configs, formal reports). Skip anything that neither teaches a core
   agentic concept nor is needed by a later project — and say what is being skipped.
3. **No code unless I ask for it.** Default to concepts, hints and where-to-change guidance.
4. **Necessary plumbing that teaches little: fix it yourself when i ask you to do so**, then tell me exactly which
   files changed and why, in a short list.
5. Keep reviews short: only point out bugs that break the feature or the lesson.

## Per-project approach

For each project: read its doc, list what later projects depend on (must-have), split it into
3–5 lessons (concept → why → I build → quick review), and explicitly skip the rest but explain me what we are skipping and their significance.

## Progress

- P01: prompt improve done (templates as files, system/user split, output contract,
  validate → repair once → exit 3). Adapter usage/[DONE] fix done.
  Next: `text summarize` (token estimate, chunking, map-reduce), then try two models, then P02.

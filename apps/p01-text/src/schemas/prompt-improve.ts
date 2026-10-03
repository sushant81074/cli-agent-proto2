import { z } from "zod";

export const PromptImproveSchema = z.object({
  improvedPrompt: z.string().min(1, "Improved prompt cannot be empty"),
  changes: z.array(z.string()).max(10, "Cannot exceed 10 changes"),
  assumptions: z.array(z.string()),
  openQuestions: z.array(z.string()).max(5, "Cannot exceed 5 open questions"),
});

export type TPromptImprove = z.infer<typeof PromptImproveSchema>;

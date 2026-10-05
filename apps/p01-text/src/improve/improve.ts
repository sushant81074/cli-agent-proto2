import type { ILLMProvider, TModelRequest } from "@agentic/llm";
import { OutputValidationError } from "../error.ts";
import { PromptImproveSchema, type TPromptImprove } from "../schemas/prompt-improve.ts";
import { executeLLMCall, type TCallHooks } from "../llm.ts";

type TParseResult =
  | { success: true; data: TPromptImprove; }
  | { success: false; errorDescription: string; };

function parseAndValidate(rawText: string): TParseResult {
  const jsonString = rawText.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();

  try {
    const parsed: unknown = JSON.parse(jsonString);

    const result = PromptImproveSchema.safeParse(parsed);
    if (result.success) return { success: true, data: result.data };

    const errorDescription = result.error.issues.map((err) => `- ${err.path.join(".")}: ${err.message}`).join("\n");

    return { success: false, errorDescription };
  } catch (error) {
    const message =
      error instanceof SyntaxError ? error.message : "Invalid JSON formatting structure";
    return { success: false, errorDescription: `- JSON parsing mismatch: ${message}` };
  }
}

export async function improvePrompt(provider: ILLMProvider, request: TModelRequest, hooks: TCallHooks = {}): Promise<TPromptImprove> {
  const activeMessages = [...request.messages];

  const firstRawOutput = await executeLLMCall(provider, request, activeMessages, hooks);
  const firstParse = parseAndValidate(firstRawOutput);

  if (firstParse.success) return firstParse.data;

  hooks.onInfo?.("Output invalid, attempting one repair...");

  activeMessages.push(
    { role: "assistant", content: [{ type: "text", text: firstRawOutput }] },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `Your response failed validation:\n${firstParse.errorDescription}\nReturn only the corrected JSON object. Keep everything that was correct.`,
        },
      ],
    },
  );

  const repairRawOutput = await executeLLMCall(provider, request, activeMessages, hooks);
  const repairParse = parseAndValidate(repairRawOutput);
  if (repairParse.success) return repairParse.data;

  throw new OutputValidationError(
    "Model response failed schema compliance after full correction budget tracking.",
    repairRawOutput,
    repairParse.errorDescription,
  );
}

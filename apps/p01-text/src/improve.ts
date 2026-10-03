import type { ILLMProvider, TMessage, TModelRequest } from "@agentic/llm";
import { OutputValidationError } from "./error.ts";
import { PromptImproveSchema, type TPromptImprove } from "./schemas/prompt-improve.ts";

export type ImproveHooks = {
  onReasoning?: (text: string) => void;
  onDelta?: (text: string) => void;
  onInfo?: (info: string) => void;
};

type TParseResult =
  | { success: true; data: TPromptImprove }
  | { success: false; errorDescription: string };

export async function executeLLMCall(
  provider: ILLMProvider,
  request: TModelRequest,
  messages: TMessage[],
  hooks: ImproveHooks = {},
): Promise<string> {
  let text = "";
  request = { ...request, messages: [...messages] };

  for await (const event of provider.complete(request)) {
    switch (event.type) {
      case "reasoning.delta":
        hooks.onReasoning?.(event.text);
        break;
      case "text.delta":
        text += event.text;
        hooks.onDelta?.(event.text);
        break;
      case "error":
        throw event.error;
    }
  }

  request.signal.throwIfAborted();
  return text;
}

function parseAndValidate(rawText: string): TParseResult {
  const jsonString = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();

  try {
    const parsed: unknown = JSON.parse(jsonString);
    const result = PromptImproveSchema.safeParse(parsed);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errorDescription = result.error.issues
      .map((err) => `- ${err.path.join(".")}: ${err.message}`)
      .join("\n");

    return { success: false, errorDescription };
  } catch (error) {
    const message =
      error instanceof SyntaxError ? error.message : "Invalid JSON formatting structure";
    return { success: false, errorDescription: `- JSON parsing mismatch: ${message}` };
  }
}

export async function improvePrompt(
  provider: ILLMProvider,
  request: TModelRequest,
  hooks: ImproveHooks = {},
): Promise<TPromptImprove> {
  const activeMessages = [...request.messages];

  // Turn 1: Initial invocation attempt
  const firstRawOutput = await executeLLMCall(provider, request, activeMessages, hooks);
  const firstParse = parseAndValidate(firstRawOutput);

  if (firstParse.success) {
    return firstParse.data;
  }

  // Intercept failure and trigger exact targeted single repair call
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

  // Turn 2: Automated healing execution
  const repairRawOutput = await executeLLMCall(provider, request, activeMessages, hooks);
  const repairParse = parseAndValidate(repairRawOutput);
  if (repairParse.success) {
    return repairParse.data;
  }

  // Exhausted execution budget -> bubble structured validation exception
  throw new OutputValidationError(
    "Model response failed schema compliance after full correction budget tracking.",
    repairRawOutput,
    repairParse.errorDescription,
  );
}

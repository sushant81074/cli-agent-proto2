import { describe, expect, it } from "vitest";
import { renderTemplate } from "../src/prompts.ts";

describe("Prompt Template System", () => {
  it("should match snapshot when user template renders with valid inputs", () => {
    const rendered = renderTemplate("user", {
      draft: "Write a short blog post about clean code.",
      goal: "Engaging and technical overview",
      audience: "Junior Developers",
    });

    expect(rendered).toMatchSnapshot();
  });

  it("should throw a clear runtime exception if an expected template variable is missing", () => {
    expect(() => {
      // Intentionally omitting 'audience' to trigger validation
      renderTemplate("user", {
        draft: "Incomplete configuration parameters",
        goal: "Test throwing exception errors",
      } as any);
    }).toThrow(/Template rendering failed\. Missing values for placeholders/);
  });
});

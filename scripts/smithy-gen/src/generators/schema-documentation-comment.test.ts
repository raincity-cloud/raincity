import { describe, expect, it } from "vitest";
import { buildSchemaDocumentationComment } from "./schema-documentation-comment.js";

describe("buildSchemaDocumentationComment", () => {
  it("returns undefined for undefined input", () => {
    expect(buildSchemaDocumentationComment(undefined)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(buildSchemaDocumentationComment("")).toBeUndefined();
  });

  it("returns undefined for whitespace-only string", () => {
    expect(buildSchemaDocumentationComment("   ")).toBeUndefined();
  });

  it("returns a fenced XML JSDoc block for a one-line text", () => {
    expect(buildSchemaDocumentationComment("The bucket name")).toBe(
      "/**\n * ```xml\n * The bucket name\n * ```\n */",
    );
  });

  it("returns a fenced XML JSDoc block for multi-line text", () => {
    expect(buildSchemaDocumentationComment("First line\nSecond line")).toBe(
      "/**\n * ```xml\n * First line\n * Second line\n * ```\n */",
    );
  });

  it("renders empty lines as bare ' *' spacers in multi-line JSDoc", () => {
    expect(buildSchemaDocumentationComment("First\n\nThird")).toBe(
      "/**\n * ```xml\n * First\n *\n * Third\n * ```\n */",
    );
  });

  it("preserves */ sequences as-is inside the fenced block", () => {
    const result = buildSchemaDocumentationComment("End: */");
    expect(result).toContain("End: */");
  });

  it("handles \\r\\n line endings", () => {
    expect(buildSchemaDocumentationComment("Line one\r\nLine two")).toBe(
      "/**\n * ```xml\n * Line one\n * Line two\n * ```\n */",
    );
  });
});

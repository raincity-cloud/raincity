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

  it("returns a single-line JSDoc for a one-line text", () => {
    expect(buildSchemaDocumentationComment("The bucket name")).toBe(
      "/** The bucket name */",
    );
  });

  it("returns a multi-line JSDoc block for multi-line text", () => {
    expect(buildSchemaDocumentationComment("First line\nSecond line")).toBe(
      "/**\n * First line\n * Second line\n */",
    );
  });

  it("renders empty lines as bare ' *' spacers in multi-line JSDoc", () => {
    expect(buildSchemaDocumentationComment("First\n\nThird")).toBe(
      "/**\n * First\n *\n * Third\n */",
    );
  });

  it("escapes */ sequences to prevent premature comment close", () => {
    const result = buildSchemaDocumentationComment("End: */");
    expect(result).toContain("*\\/");
  });

  it("handles \\r\\n line endings", () => {
    expect(buildSchemaDocumentationComment("Line one\r\nLine two")).toBe(
      "/**\n * Line one\n * Line two\n */",
    );
  });
});

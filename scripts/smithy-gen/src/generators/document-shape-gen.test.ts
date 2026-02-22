import { describe, expect, it } from "vitest";
import { CodeGenContext } from "../codegen-context.js";
import type { DocumentShape } from "../shapes/document-shape.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";

function makeModel(shapes: Record<string, DocumentShape>): SmithyAstModel {
  return { shapes };
}

describe("CodeGenContext document shape generation", () => {
  it("generates a basic document schema using z.unknown()", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#RulesDocument": { type: "document" },
      }),
    );
    ctx.generate();
    expect(ctx.renderFiles().get("s3-schemas:schema")).toContain(
      "export const rulesDocumentSchema = z.unknown();",
    );
  });

  it("generates a schema with a JSDoc comment from the documentation trait", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#RulesDocument": {
          type: "document",
          traits: {
            "smithy.api#documentation": "Endpoint resolution rules document",
          },
        },
      }),
    );
    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:schema") ?? "";
    expect(output).toContain("* Endpoint resolution rules document\n * ```");
    expect(output).toContain("export const rulesDocumentSchema = z.unknown();");
  });

  it("preserves */ as-is inside the fenced XML block", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#RulesDocument": {
          type: "document",
          traits: {
            "smithy.api#documentation": "Comment end token: */",
          },
        },
      }),
    );
    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:schema") ?? "";
    expect(output).toContain("Comment end token: */");
    expect(output).toContain("export const rulesDocumentSchema = z.unknown();");
  });

  it("routes com.amazonaws.s3 shapes to the s3-schemas file", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.s3#EndpointRuleSet": { type: "document" } }),
    );
    ctx.generate();
    const files = ctx.renderFiles();
    expect(files.has("s3-schemas:schema")).toBe(true);
    expect(files.has("common-schemas:com.amazonaws.shared:schema")).toBe(false);
  });

  it("routes non-S3 shapes to the common-schemas:com.amazonaws.shared file", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.shared#EndpointRuleSet": { type: "document" },
      }),
    );
    ctx.generate();
    const files = ctx.renderFiles();
    expect(files.has("common-schemas:com.amazonaws.shared:schema")).toBe(true);
    expect(files.has("s3-schemas:schema")).toBe(false);
  });

  it("emits multiple document shapes from the same namespace into one file", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#RuleSetA": { type: "document" },
        "com.amazonaws.s3#RuleSetB": { type: "document" },
      }),
    );
    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:schema") ?? "";
    expect(output).toContain("ruleSetASchema");
    expect(output).toContain("ruleSetBSchema");
  });

  it("camelCases the shape name to produce the schema variable name", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#MyDocumentType": { type: "document" },
      }),
    );
    ctx.generate();
    expect(ctx.renderFiles().get("s3-schemas:schema")).toContain(
      "myDocumentTypeSchema",
    );
  });
});

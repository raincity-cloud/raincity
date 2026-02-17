import { describe, expect, it } from "vitest";
import { CodeGenContext } from "../codegen-context.js";
import type { IntegerShape } from "../shapes/integer-shape.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";
import { buildConstraintChain } from "./integer-shape-gen.js";

function makeModel(shapes: Record<string, IntegerShape>): SmithyAstModel {
  return { shapes };
}

describe("buildConstraintChain", () => {
  it("returns empty string when traits is undefined", () => {
    expect(buildConstraintChain(undefined)).toBe("");
  });

  it("returns empty string when range has neither min nor max", () => {
    expect(buildConstraintChain({ "smithy.api#range": {} })).toBe("");
  });

  it("returns .min() for range with min only", () => {
    expect(buildConstraintChain({ "smithy.api#range": { min: 1 } })).toBe(
      ".min(1)",
    );
  });

  it("returns .max() for range with max only", () => {
    expect(buildConstraintChain({ "smithy.api#range": { max: 100 } })).toBe(
      ".max(100)",
    );
  });

  it("returns .min().max() for range with min and max", () => {
    expect(
      buildConstraintChain({ "smithy.api#range": { min: 1, max: 100 } }),
    ).toBe(".min(1).max(100)");
  });

  it("handles min of 0 (falsy but valid)", () => {
    expect(buildConstraintChain({ "smithy.api#range": { min: 0 } })).toBe(
      ".min(0)",
    );
  });
});

describe("CodeGenContext integer shape generation", () => {
  it("generates a basic integer schema with no traits", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.s3#MaxKeys": { type: "integer" } }),
    );
    ctx.generate();
    expect(ctx.renderFiles().get("s3-schemas")).toContain(
      "export const maxKeysSchema = z.number();",
    );
  });

  it("generates a schema with a min range constraint", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#PartNumber": {
          type: "integer",
          traits: { "smithy.api#range": { min: 1 } },
        },
      }),
    );
    ctx.generate();
    expect(ctx.renderFiles().get("s3-schemas")).toContain("z.number().min(1)");
  });

  it("generates a schema with a max range constraint", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#MaxParts": {
          type: "integer",
          traits: { "smithy.api#range": { max: 100 } },
        },
      }),
    );
    ctx.generate();
    expect(ctx.renderFiles().get("s3-schemas")).toContain(
      "z.number().max(100)",
    );
  });

  it("generates a schema with min and max range constraints", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#CopySourceVersionId": {
          type: "integer",
          traits: { "smithy.api#range": { min: 1, max: 100 } },
        },
      }),
    );
    ctx.generate();
    expect(ctx.renderFiles().get("s3-schemas")).toContain(
      "z.number().min(1).max(100)",
    );
  });

  it("routes com.amazonaws.s3 shapes to the s3-schemas file", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.s3#MaxKeys": { type: "integer" } }),
    );
    ctx.generate();
    const files = ctx.renderFiles();
    expect(files.has("s3-schemas")).toBe(true);
    expect(files.has("common-schemas")).toBe(false);
  });

  it("routes non-S3 shapes to the common-schemas file", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.shared#Count": { type: "integer" } }),
    );
    ctx.generate();
    const files = ctx.renderFiles();
    expect(files.has("common-schemas")).toBe(true);
    expect(files.has("s3-schemas")).toBe(false);
  });

  it("emits multiple shapes from the same namespace into one file", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#Alpha": { type: "integer" },
        "com.amazonaws.s3#Beta": { type: "integer" },
      }),
    );
    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas") ?? "";
    expect(output).toContain("alphaSchema");
    expect(output).toContain("betaSchema");
  });

  it("camelCases the shape name to produce the schema variable name", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.s3#MyIntegerShape": { type: "integer" } }),
    );
    ctx.generate();
    expect(ctx.renderFiles().get("s3-schemas")).toContain(
      "myIntegerShapeSchema",
    );
  });
});

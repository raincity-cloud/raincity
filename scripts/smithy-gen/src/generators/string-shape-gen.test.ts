import { describe, expect, it } from "vitest";
import { CodeGenContext } from "../codegen-context.js";
import type { StringShape } from "../shapes/string-shape.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";
import { buildConstraintChain } from "./string-shape-gen.js";

function makeModel(shapes: Record<string, StringShape>): SmithyAstModel {
  return { shapes };
}

describe("buildConstraintChain", () => {
  it("returns empty string when traits is undefined", () => {
    expect(buildConstraintChain(undefined)).toBe("");
  });

  it("returns empty string when traits has no length or pattern", () => {
    expect(buildConstraintChain({ "smithy.api#documentation": "A doc" })).toBe(
      "",
    );
  });

  it("returns .min() for length with min only", () => {
    expect(buildConstraintChain({ "smithy.api#length": { min: 1 } })).toBe(
      ".min(1)",
    );
  });

  it("returns .max() for length with max only", () => {
    expect(buildConstraintChain({ "smithy.api#length": { max: 255 } })).toBe(
      ".max(255)",
    );
  });

  it("returns .min().max() for length with min and max", () => {
    expect(
      buildConstraintChain({ "smithy.api#length": { min: 1, max: 255 } }),
    ).toBe(".min(1).max(255)");
  });

  it("returns .regex() for pattern trait", () => {
    expect(buildConstraintChain({ "smithy.api#pattern": "^[a-z]+$" })).toBe(
      '.regex(new RegExp("^[a-z]+$"))',
    );
  });

  it("combines length and pattern in order", () => {
    expect(
      buildConstraintChain({
        "smithy.api#length": { min: 1, max: 255 },
        "smithy.api#pattern": "^[a-z]+$",
      }),
    ).toBe('.min(1).max(255).regex(new RegExp("^[a-z]+$"))');
  });

  it("handles min of 0 (falsy but valid)", () => {
    expect(buildConstraintChain({ "smithy.api#length": { min: 0 } })).toBe(
      ".min(0)",
    );
  });
});

describe("CodeGenContext string shape generation", () => {
  it("generates a basic string schema with no traits", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.s3#BucketName": { type: "string" } }),
    );
    ctx.generate();
    expect(ctx.renderFiles().get("s3-schemas:schema")).toContain(
      "export const bucketNameSchema = z.string();",
    );
  });

  it("generates a schema with a JSDoc comment from the documentation trait", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#BucketName": {
          type: "string",
          traits: { "smithy.api#documentation": "The name of the bucket" },
        },
      }),
    );
    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:schema") ?? "";
    expect(output).toContain("* The name of the bucket\n * ```");
    expect(output).toContain("export const bucketNameSchema = z.string();");
  });

  it("generates a schema with a min length constraint", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#Key": {
          type: "string",
          traits: { "smithy.api#length": { min: 1 } },
        },
      }),
    );
    ctx.generate();
    expect(ctx.renderFiles().get("s3-schemas:schema")).toContain(
      "z.string().min(1)",
    );
  });

  it("generates a schema with a max length constraint", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#Token": {
          type: "string",
          traits: { "smithy.api#length": { max: 1024 } },
        },
      }),
    );
    ctx.generate();
    expect(ctx.renderFiles().get("s3-schemas:schema")).toContain(
      "z.string().max(1024)",
    );
  });

  it("generates a schema with min and max length constraints", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#Id": {
          type: "string",
          traits: { "smithy.api#length": { min: 1, max: 255 } },
        },
      }),
    );
    ctx.generate();
    expect(ctx.renderFiles().get("s3-schemas:schema")).toContain(
      "z.string().min(1).max(255)",
    );
  });

  it("generates a schema with a pattern regex constraint", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#ArnNamespace": {
          type: "string",
          traits: { "smithy.api#pattern": "^[a-z0-9]+$" },
        },
      }),
    );
    ctx.generate();
    expect(ctx.renderFiles().get("s3-schemas:schema")).toContain(
      '.regex(new RegExp("^[a-z0-9]+$"))',
    );
  });

  it("generates a schema with documentation, length, and pattern all combined", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#FilterKey": {
          type: "string",
          traits: {
            "smithy.api#documentation": "A filter key",
            "smithy.api#length": { min: 1, max: 1024 },
            "smithy.api#pattern": "^[a-zA-Z0-9]+$",
          },
        },
      }),
    );
    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:schema") ?? "";
    expect(output).toContain("* A filter key\n * ```");
    expect(output).toContain(
      '.min(1).max(1024).regex(new RegExp("^[a-zA-Z0-9]+$"))',
    );
  });

  it("routes com.amazonaws.s3 shapes to the s3-schemas file", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.s3#Foo": { type: "string" } }),
    );
    ctx.generate();
    const files = ctx.renderFiles();
    expect(files.has("s3-schemas:schema")).toBe(true);
    expect(files.has("common-schemas:com.amazonaws.shared:schema")).toBe(false);
  });

  it("routes non-S3 shapes to the common-schemas:com.amazonaws.shared file", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.shared#Arn": { type: "string" } }),
    );
    ctx.generate();
    const files = ctx.renderFiles();
    expect(files.has("common-schemas:com.amazonaws.shared:schema")).toBe(true);
    expect(files.has("s3-schemas:schema")).toBe(false);
  });

  it("emits multiple shapes from the same namespace into one file", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#Alpha": { type: "string" },
        "com.amazonaws.s3#Beta": { type: "string" },
      }),
    );
    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:schema") ?? "";
    expect(output).toContain("alphaSchema");
    expect(output).toContain("betaSchema");
  });

  it("camelCases the shape name to produce the schema variable name", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.s3#MyShapeName": { type: "string" } }),
    );
    ctx.generate();
    expect(ctx.renderFiles().get("s3-schemas:schema")).toContain(
      "myShapeNameSchema",
    );
  });
});

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
  it("does not emit standalone string schemas", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.s3#BucketName": { type: "string" } }),
    );

    ctx.generate();
    expect(ctx.renderFiles().size).toBe(0);
  });

  it("does not emit standalone string schemas for non-S3 namespaces", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.shared#Arn": { type: "string" } }),
    );

    ctx.generate();
    expect(ctx.renderFiles().size).toBe(0);
  });
});

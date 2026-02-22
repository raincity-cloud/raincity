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
  it("does not emit standalone integer schemas", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.s3#MaxKeys": { type: "integer" } }),
    );

    ctx.generate();
    expect(ctx.renderFiles().size).toBe(0);
  });

  it("does not emit standalone integer schemas for non-S3 namespaces", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.shared#Count": { type: "integer" } }),
    );

    ctx.generate();
    expect(ctx.renderFiles().size).toBe(0);
  });
});

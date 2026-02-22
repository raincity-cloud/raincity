import { describe, expect, it } from "vitest";
import { CodeGenContext } from "../codegen-context.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";
import { buildConstraintChain } from "./list-shape-gen.js";

function makeModel(shapes: SmithyAstModel["shapes"]): SmithyAstModel {
  return { shapes };
}

describe("buildConstraintChain", () => {
  it("returns empty string when traits is undefined", () => {
    expect(buildConstraintChain(undefined)).toBe("");
  });

  it("returns .min() for length with min only", () => {
    expect(buildConstraintChain({ "smithy.api#length": { min: 1 } })).toBe(
      ".min(1)",
    );
  });

  it("returns .max() for length with max only", () => {
    expect(buildConstraintChain({ "smithy.api#length": { max: 25 } })).toBe(
      ".max(25)",
    );
  });

  it("returns .min().max() for length with min and max", () => {
    expect(
      buildConstraintChain({ "smithy.api#length": { min: 1, max: 25 } }),
    ).toBe(".min(1).max(25)");
  });

  it("appends a unique item refinement when uniqueItems is present", () => {
    expect(buildConstraintChain({ "smithy.api#uniqueItems": {} })).toContain(
      ".superRefine((items, refinementContext) => {",
    );
  });

  it("combines length and uniqueItems in order", () => {
    expect(
      buildConstraintChain({
        "smithy.api#length": { min: 1, max: 25 },
        "smithy.api#uniqueItems": {},
      }),
    ).toContain(".min(1).max(25).superRefine((items, refinementContext) => {");
  });
});

describe("CodeGenContext list shape generation", () => {
  it("does not emit standalone list schemas", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#TagKey": { type: "string" },
        "com.amazonaws.s3#TagKeys": {
          type: "list",
          member: { target: "com.amazonaws.s3#TagKey" },
        },
      }),
    );

    ctx.generate();
    expect(ctx.renderFiles().size).toBe(0);
  });
});

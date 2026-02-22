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
  it("generates a list schema using a generated member target", () => {
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
    const output = ctx.renderFiles().get("s3-schemas:schema") ?? "";
    expect(output).toContain(
      "export const tagKeysSchema = z.array(z.lazy(() => tagKeySchema));",
    );
  });

  it("adds list documentation, length constraints, and unique item validation", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#TagKey": { type: "string" },
        "com.amazonaws.s3#TagKeys": {
          type: "list",
          traits: {
            "smithy.api#documentation": "Unique tag keys.",
            "smithy.api#length": { min: 1, max: 10 },
            "smithy.api#uniqueItems": {},
          },
          member: { target: "com.amazonaws.s3#TagKey" },
        },
      }),
    );
    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:schema") ?? "";
    expect(output).toContain("* Unique tag keys.\n * ```");
    expect(output).toContain(
      ".array(z.lazy(() => tagKeySchema)).min(1).max(10)",
    );
    expect(output).toContain("Duplicate items are not allowed.");
  });

  it("falls back to z.unknown when member target is not generated", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#Objects": {
          type: "list",
          member: { target: "com.amazonaws.s3#ObjectRecord" },
        },
      }),
    );
    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:schema") ?? "";
    expect(output).toContain(
      "export const objectsSchema = z.array(z.unknown());",
    );
  });

  it("uses the member documentation helper", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#TagKey": { type: "string" },
        "com.amazonaws.s3#TagKeys": {
          type: "list",
          member: {
            target: "com.amazonaws.s3#TagKey",
            traits: {
              "smithy.api#documentation": "A single tag key.",
              "smithy.api#xmlName": "Tag",
            },
          },
        },
      }),
    );
    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:schema") ?? "";
    expect(output).toContain("* A single tag key.\n * ```");
  });

  it("generates list shapes after existing generated scalar shapes", () => {
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
    const output = ctx.renderFiles().get("s3-schemas:schema") ?? "";
    expect(
      output.indexOf("export const tagKeySchema = z.string();"),
    ).toBeLessThan(
      output.indexOf(
        "export const tagKeysSchema = z.array(z.lazy(() => tagKeySchema));",
      ),
    );
  });
});

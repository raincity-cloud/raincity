import { describe, expect, it } from "vitest";
import { CodeGenContext } from "../codegen-context.js";
import type { BooleanShape } from "../shapes/boolean-shape.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";

function makeModel(shapes: Record<string, BooleanShape>): SmithyAstModel {
  return { shapes };
}

describe("CodeGenContext boolean shape generation", () => {
  it("generates a basic boolean schema with no traits", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#BucketVersioningEnabled": { type: "boolean" },
      }),
    );
    ctx.generate();
    expect(ctx.renderFiles().get("s3-schemas")).toContain(
      "export const bucketVersioningEnabledSchema = z.boolean();",
    );
  });

  it("routes com.amazonaws.s3 shapes to the s3-schemas file", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.s3#EnableFlag": { type: "boolean" } }),
    );
    ctx.generate();
    const files = ctx.renderFiles();
    expect(files.has("s3-schemas")).toBe(true);
    expect(files.has("common-schemas")).toBe(false);
  });

  it("routes non-S3 shapes to the common-schemas file", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.shared#IsEnabled": { type: "boolean" } }),
    );
    ctx.generate();
    const files = ctx.renderFiles();
    expect(files.has("common-schemas")).toBe(true);
    expect(files.has("s3-schemas")).toBe(false);
  });

  it("emits multiple boolean shapes from the same namespace into one file", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#FlagA": { type: "boolean" },
        "com.amazonaws.s3#FlagB": { type: "boolean" },
      }),
    );
    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas") ?? "";
    expect(output).toContain("flagASchema");
    expect(output).toContain("flagBSchema");
  });

  it("camelCases the shape name to produce the schema variable name", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.s3#MyBooleanFlag": { type: "boolean" } }),
    );
    ctx.generate();
    expect(ctx.renderFiles().get("s3-schemas")).toContain(
      "myBooleanFlagSchema",
    );
  });
});

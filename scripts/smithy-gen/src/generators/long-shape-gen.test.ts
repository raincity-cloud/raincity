import { describe, expect, it } from "vitest";
import { CodeGenContext } from "../codegen-context.js";
import type { LongShape } from "../shapes/long-shape.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";

function makeModel(shapes: Record<string, LongShape>): SmithyAstModel {
  return { shapes };
}

describe("CodeGenContext long shape generation", () => {
  it("generates a basic long schema as z.bigint()", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.s3#BytesProcessed": { type: "long" } }),
    );
    ctx.generate();
    expect(ctx.renderFiles().get("s3-schemas:schema")).toContain(
      "export const bytesProcessedSchema = z.bigint();",
    );
  });

  it("routes com.amazonaws.s3 shapes to the s3-schemas file", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.s3#TotalBytes": { type: "long" } }),
    );
    ctx.generate();
    const files = ctx.renderFiles();
    expect(files.has("s3-schemas:schema")).toBe(true);
    expect(files.has("common-schemas:com.amazonaws.shared:schema")).toBe(false);
  });

  it("routes non-S3 shapes to the common-schemas:com.amazonaws.shared file", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.shared#Count": { type: "long" } }),
    );
    ctx.generate();
    const files = ctx.renderFiles();
    expect(files.has("common-schemas:com.amazonaws.shared:schema")).toBe(true);
    expect(files.has("s3-schemas:schema")).toBe(false);
  });

  it("emits multiple long shapes from the same namespace into one file", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#Alpha": { type: "long" },
        "com.amazonaws.s3#Beta": { type: "long" },
      }),
    );
    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:schema") ?? "";
    expect(output).toContain("alphaSchema");
    expect(output).toContain("betaSchema");
  });

  it("camelCases the shape name to produce the schema variable name", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.s3#MyLongShape": { type: "long" } }),
    );
    ctx.generate();
    expect(ctx.renderFiles().get("s3-schemas:schema")).toContain(
      "myLongShapeSchema",
    );
  });

  it("generates the same output when traits are present", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#BytesReturned": { type: "long", traits: {} },
      }),
    );
    ctx.generate();
    expect(ctx.renderFiles().get("s3-schemas:schema")).toContain(
      "export const bytesReturnedSchema = z.bigint();",
    );
  });
});

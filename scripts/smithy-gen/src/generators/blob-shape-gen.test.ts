import { describe, expect, it } from "vitest";
import { CodeGenContext } from "../codegen-context.js";
import type { BlobShape } from "../shapes/blob-shape.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";

function makeModel(shapes: Record<string, BlobShape>): SmithyAstModel {
  return { shapes };
}

describe("CodeGenContext blob shape generation", () => {
  it("generates a basic blob schema using z.instanceof(Uint8Array)", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#RequestBody": { type: "blob" },
      }),
    );
    ctx.generate();
    expect(ctx.renderFiles().get("s3-schemas")).toContain(
      "export const requestBodySchema = z.instanceof(Uint8Array);",
    );
  });

  it("routes com.amazonaws.s3 shapes to the s3-schemas file", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.s3#Body": { type: "blob" } }),
    );
    ctx.generate();
    const files = ctx.renderFiles();
    expect(files.has("s3-schemas")).toBe(true);
    expect(files.has("common-schemas:com.amazonaws.shared")).toBe(false);
  });

  it("routes non-S3 shapes to the common-schemas:com.amazonaws.shared file", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.shared#Payload": { type: "blob" } }),
    );
    ctx.generate();
    const files = ctx.renderFiles();
    expect(files.has("common-schemas:com.amazonaws.shared")).toBe(true);
    expect(files.has("s3-schemas")).toBe(false);
  });

  it("emits multiple blob shapes from the same namespace into one file", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#BodyA": { type: "blob" },
        "com.amazonaws.s3#BodyB": { type: "blob" },
      }),
    );
    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas") ?? "";
    expect(output).toContain("bodyASchema");
    expect(output).toContain("bodyBSchema");
  });

  it("camelCases the shape name to produce the schema variable name", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.s3#MyBlobType": { type: "blob" } }),
    );
    ctx.generate();
    expect(ctx.renderFiles().get("s3-schemas")).toContain("myBlobTypeSchema");
  });

  it("generates the same output for a blob shape with the streaming trait", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#StreamingBody": {
          type: "blob",
          traits: { "smithy.api#streaming": {} },
        },
      }),
    );
    ctx.generate();
    expect(ctx.renderFiles().get("s3-schemas")).toContain(
      "export const streamingBodySchema = z.instanceof(Uint8Array);",
    );
  });
});

import { describe, expect, it } from "vitest";
import { CodeGenContext } from "../codegen-context.js";
import type { BlobShape } from "../shapes/blob-shape.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";

function makeModel(shapes: Record<string, BlobShape>): SmithyAstModel {
  return { shapes };
}

describe("CodeGenContext blob shape generation", () => {
  it("does not emit standalone blob schemas", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#RequestBody": { type: "blob" },
      }),
    );

    ctx.generate();
    expect(ctx.renderFiles().size).toBe(0);
  });

  it("does not emit standalone blob schemas for non-S3 namespaces", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.shared#Payload": { type: "blob" } }),
    );

    ctx.generate();
    expect(ctx.renderFiles().size).toBe(0);
  });
});

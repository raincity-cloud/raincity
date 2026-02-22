import { describe, expect, it } from "vitest";
import { CodeGenContext } from "../codegen-context.js";
import type { LongShape } from "../shapes/long-shape.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";

function makeModel(shapes: Record<string, LongShape>): SmithyAstModel {
  return { shapes };
}

describe("CodeGenContext long shape generation", () => {
  it("does not emit standalone long schemas", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.s3#BytesProcessed": { type: "long" } }),
    );

    ctx.generate();
    expect(ctx.renderFiles().size).toBe(0);
  });

  it("does not emit standalone long schemas for non-S3 namespaces", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.shared#Count": { type: "long" } }),
    );

    ctx.generate();
    expect(ctx.renderFiles().size).toBe(0);
  });
});

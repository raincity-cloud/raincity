import { describe, expect, it } from "vitest";
import { CodeGenContext } from "../codegen-context.js";
import type { BooleanShape } from "../shapes/boolean-shape.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";

function makeModel(shapes: Record<string, BooleanShape>): SmithyAstModel {
  return { shapes };
}

describe("CodeGenContext boolean shape generation", () => {
  it("does not emit standalone boolean schemas", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#BucketVersioningEnabled": { type: "boolean" },
      }),
    );

    ctx.generate();
    expect(ctx.renderFiles().size).toBe(0);
  });

  it("does not emit standalone boolean schemas for non-S3 namespaces", () => {
    const ctx = new CodeGenContext(
      makeModel({ "com.amazonaws.shared#IsEnabled": { type: "boolean" } }),
    );

    ctx.generate();
    expect(ctx.renderFiles().size).toBe(0);
  });
});

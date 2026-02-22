import { describe, expect, it } from "vitest";
import { CodeGenContext } from "../codegen-context.js";
import type { TimestampShape } from "../shapes/timestamp-shape.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";

function makeModel(shapes: Record<string, TimestampShape>): SmithyAstModel {
  return { shapes };
}

describe("CodeGenContext timestamp shape generation", () => {
  it("does not emit standalone timestamp schemas", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#CreatedAt": {
          type: "timestamp",
          traits: { "smithy.api#timestampFormat": "date-time" },
        },
      }),
    );

    ctx.generate();
    expect(ctx.renderFiles().size).toBe(0);
  });

  it("does not emit standalone timestamp schemas for non-S3 namespaces", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.shared#SharedTime": {
          type: "timestamp",
          traits: { "smithy.api#timestampFormat": "date-time" },
        },
      }),
    );

    ctx.generate();
    expect(ctx.renderFiles().size).toBe(0);
  });
});

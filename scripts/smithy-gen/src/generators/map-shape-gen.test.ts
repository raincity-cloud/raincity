import { describe, expect, it } from "vitest";
import { CodeGenContext } from "../codegen-context.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";

function makeModel(shapes: SmithyAstModel["shapes"]): SmithyAstModel {
  return { shapes };
}

describe("CodeGenContext map shape generation", () => {
  it("does not emit standalone map schemas", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#TagMap": {
          type: "map",
          key: { target: "smithy.api#String" },
          value: { target: "smithy.api#Boolean" },
        },
      }),
    );

    ctx.generate();
    expect(ctx.renderFiles().size).toBe(0);
  });

  it("does not validate map key compatibility in a standalone map generator pass", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#InvalidBuiltinKeyMap": {
          type: "map",
          key: { target: "smithy.api#Boolean" },
          value: { target: "smithy.api#String" },
        },
      }),
    );

    expect(() => ctx.generate()).not.toThrow();
  });
});

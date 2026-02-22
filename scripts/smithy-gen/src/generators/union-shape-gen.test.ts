import { describe, expect, it } from "vitest";
import { CodeGenContext } from "../codegen-context.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";

function makeModel(shapes: SmithyAstModel["shapes"]): SmithyAstModel {
  return { shapes };
}

describe("CodeGenContext union shape generation", () => {
  it("does not emit standalone union schemas", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#BuiltinUnion": {
          type: "union",
          traits: {},
          members: {
            Name: { target: "smithy.api#String", traits: {} },
            Flag: { target: "smithy.api#Boolean", traits: {} },
          },
        },
      }),
    );

    ctx.generate();
    expect(ctx.renderFiles().size).toBe(0);
  });
});

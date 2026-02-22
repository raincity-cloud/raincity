import { describe, expect, it } from "vitest";
import { CodeGenContext } from "../codegen-context.js";
import type { DocumentShape } from "../shapes/document-shape.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";

function makeModel(shapes: Record<string, DocumentShape>): SmithyAstModel {
  return { shapes };
}

describe("CodeGenContext document shape generation", () => {
  it("does not emit standalone document schemas", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#RulesDocument": {
          type: "document",
          traits: {
            "smithy.api#documentation": "Endpoint resolution rules document",
          },
        },
      }),
    );

    ctx.generate();
    expect(ctx.renderFiles().size).toBe(0);
  });

  it("does not emit standalone document schemas for non-S3 namespaces", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.shared#EndpointRuleSet": { type: "document" },
      }),
    );

    ctx.generate();
    expect(ctx.renderFiles().size).toBe(0);
  });
});

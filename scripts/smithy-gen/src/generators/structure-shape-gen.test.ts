import { describe, expect, it } from "vitest";
import { CodeGenContext } from "../codegen-context.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";
import { buildMemberConstraintChain } from "./structure-shape-gen.js";

function makeModel(shapes: SmithyAstModel["shapes"]): SmithyAstModel {
  return { shapes };
}

describe("buildMemberConstraintChain", () => {
  it("defaults members to optional", () => {
    expect(buildMemberConstraintChain(undefined)).toBe(".optional()");
  });

  it("marks members as required when smithy.api#required is present", () => {
    expect(
      buildMemberConstraintChain({ "smithy.api#required": {} }),
    ).not.toContain(".optional()");
  });

  it("applies default after optional so missing members receive a default value", () => {
    expect(
      buildMemberConstraintChain(
        { "smithy.api#default": "Enabled" },
        { targetShapeType: "string" },
      ),
    ).toBe('.optional().default("Enabled")');
  });

  it("applies length and range constraints", () => {
    const constraints = buildMemberConstraintChain({
      "smithy.api#length": { min: 1, max: 5 },
      "smithy.api#range": { min: 10, max: 20 },
    });
    expect(constraints).toContain("currentLength < 1");
    expect(constraints).toContain("currentLength > 5");
    expect(constraints).toContain('typeof value === "number" && value < 10');
    expect(constraints).toContain('typeof value === "number" && value > 20');
    expect(constraints).toContain(".optional()");
  });

  it("skips length and range when disabled for unresolved targets", () => {
    expect(
      buildMemberConstraintChain(
        {
          "smithy.api#length": { min: 1, max: 5 },
          "smithy.api#range": { min: 10, max: 20 },
        },
        { applyLength: false, applyRange: false },
      ),
    ).toBe(".optional()");
  });

  it("can disable default chaining", () => {
    expect(
      buildMemberConstraintChain(
        { "smithy.api#default": "Enabled" },
        { applyDefault: false },
      ),
    ).toBe(".optional()");
  });

  it("converts blob defaults from base64 into Uint8Array literals", () => {
    expect(
      buildMemberConstraintChain(
        { "smithy.api#default": "AQID" },
        { targetShapeType: "blob" },
      ),
    ).toBe(".optional().default(new Uint8Array([1, 2, 3]))");
  });

  it("throws when default value does not match target schema type", () => {
    expect(() =>
      buildMemberConstraintChain(
        { "smithy.api#default": true },
        {
          memberLocation: "structure member Example.Flag",
          targetShapeType: "string",
        },
      ),
    ).toThrow(
      "Unsupported smithy.api#default value on structure member Example.Flag: string targets require a string default.",
    );
  });
});

describe("CodeGenContext structure shape generation", () => {
  it("generates structure members with documentation, required, optional, and default traits", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#TagKey": { type: "string" },
        "com.amazonaws.s3#Tag": {
          type: "structure",
          traits: {
            "smithy.api#documentation": "A tag structure",
          },
          members: {
            Key: {
              target: "com.amazonaws.s3#TagKey",
              traits: {
                "smithy.api#documentation": "Tag key",
                "smithy.api#required": {},
              },
            },
            Value: {
              target: "com.amazonaws.s3#TagKey",
              traits: {
                "smithy.api#default": "none",
              },
            },
          },
          mixins: {},
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:structures") ?? "";

    expect(output).toContain("* A tag structure\n * ```");
    expect(output).toContain("   * Tag key\n   * ```");
    expect(output).toContain("Key: tagKeySchema,");
    expect(output).toContain('Value: tagKeySchema.optional().default("none"),');
  });

  it("renders blob defaults as Uint8Array literals", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#StreamingBlob": { type: "blob" },
        "com.amazonaws.s3#GetObjectOutput": {
          type: "structure",
          members: {
            Body: {
              target: "com.amazonaws.s3#StreamingBlob",
              traits: {
                "smithy.api#default": "",
              },
            },
          },
          mixins: {},
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:structures") ?? "";

    expect(output).toContain(
      "Body: streamingBlobSchema.optional().default(new Uint8Array([]))",
    );
  });

  it("falls back to z.unknown when a structure member target is unresolved", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#Tag": {
          type: "structure",
          members: {
            Key: {
              target: "com.amazonaws.s3#MissingShape",
            },
          },
          mixins: {},
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:structures") ?? "";
    expect(output).toContain("Key: z.unknown().optional()");
  });

  it("resolves forward references between structure shapes", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#Parent": {
          type: "structure",
          members: {
            Child: { target: "com.amazonaws.s3#Child" },
          },
          mixins: {},
        },
        "com.amazonaws.s3#Child": {
          type: "structure",
          members: {},
          mixins: {},
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:structures") ?? "";

    expect(output).toContain("Child: z.lazy(() => childSchema).optional()");
  });

  it("generates structure shapes before list shapes", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#TagKey": { type: "string" },
        "com.amazonaws.s3#Tag": {
          type: "structure",
          members: {
            Key: {
              target: "com.amazonaws.s3#TagKey",
            },
          },
          mixins: {},
        },
        "com.amazonaws.s3#TagList": {
          type: "list",
          member: {
            target: "com.amazonaws.s3#Tag",
          },
        },
      }),
    );

    ctx.generate();
    const schemaOutput = ctx.renderFiles().get("s3-schemas:schema") ?? "";
    const structuresOutput =
      ctx.renderFiles().get("s3-schemas:structures") ?? "";

    expect(schemaOutput).toContain(
      "export const tagListSchema = z.array(tagSchema);",
    );
    expect(structuresOutput).toContain("export const tagSchema = z.object({");
  });
});

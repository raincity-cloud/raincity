import { describe, expect, it } from "vitest";
import { CodeGenContext } from "../codegen-context.js";
import type { EnumShape } from "../shapes/enum-shape.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";

function makeModel(shapes: Record<string, EnumShape>): SmithyAstModel {
  return { shapes };
}

describe("CodeGenContext enum shape generation", () => {
  it("generates a native TypeScript enum and a zod enum schema", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#StorageClass": {
          type: "enum",
          members: {
            STANDARD: {
              target: "smithy.api#Unit",
              traits: { "smithy.api#enumValue": "STANDARD" },
            },
            GLACIER: {
              target: "smithy.api#Unit",
              traits: { "smithy.api#enumValue": "GLACIER" },
            },
          },
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas") ?? "";
    expect(output).toContain("export enum StorageClass {");
    expect(output).toContain('STANDARD = "STANDARD",');
    expect(output).toContain('GLACIER = "GLACIER",');
    expect(output).toContain(
      "export const storageClassSchema = z.enum(StorageClass);",
    );
  });

  it("puts shape documentation on the generated enum, not on the schema export", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#Delimiter": {
          type: "enum",
          traits: {
            "smithy.api#documentation": "The possible delimiters.",
          },
          members: {
            FORWARD_SLASH: {
              target: "smithy.api#Unit",
              traits: { "smithy.api#enumValue": "/" },
            },
          },
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas") ?? "";
    expect(output).toContain(
      "/** The possible delimiters. */\nexport enum Delimiter {",
    );
    expect(output).not.toContain(
      "/** The possible delimiters. */\nexport const delimiterSchema",
    );
  });

  it("puts member documentation on generated enum members", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#Delimiter": {
          type: "enum",
          members: {
            FORWARD_SLASH: {
              target: "smithy.api#Unit",
              traits: {
                "smithy.api#documentation": "The `/` character.",
                "smithy.api#enumValue": "/",
              },
            },
            COLON: {
              target: "smithy.api#Unit",
              traits: {
                "smithy.api#documentation": "Comment end token: */",
                "smithy.api#enumValue": ":",
              },
            },
          },
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas") ?? "";
    expect(output).toContain(
      '/** The `/` character. */\n  FORWARD_SLASH = "/",',
    );
    expect(output).toContain("Comment end token: *\\/");
    expect(output).toContain('COLON = ":",');
  });

  it("falls back to member key when enumValue is missing", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#State": {
          type: "enum",
          members: {
            Enabled: {
              target: "smithy.api#Unit",
              traits: {},
            },
          },
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas") ?? "";
    expect(output).toContain('Enabled = "Enabled",');
  });

  it("routes non-S3 enum shapes to common-schemas:com.amazonaws.shared", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.shared#SharedEnum": {
          type: "enum",
          members: {
            VALUE: {
              target: "smithy.api#Unit",
              traits: { "smithy.api#enumValue": "VALUE" },
            },
          },
        },
      }),
    );

    ctx.generate();
    const files = ctx.renderFiles();
    expect(files.has("common-schemas:com.amazonaws.shared")).toBe(true);
    expect(files.has("s3-schemas")).toBe(false);
  });

  it("emits multiple enum shapes from the same namespace into one file", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#FirstEnum": {
          type: "enum",
          members: {
            ONE: {
              target: "smithy.api#Unit",
              traits: { "smithy.api#enumValue": "ONE" },
            },
          },
        },
        "com.amazonaws.s3#SecondEnum": {
          type: "enum",
          members: {
            TWO: {
              target: "smithy.api#Unit",
              traits: { "smithy.api#enumValue": "TWO" },
            },
          },
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas") ?? "";
    expect(output).toContain("export enum FirstEnum {");
    expect(output).toContain("export enum SecondEnum {");
    expect(output).toContain("firstEnumSchema");
    expect(output).toContain("secondEnumSchema");
  });
});

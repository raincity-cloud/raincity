import { describe, expect, it } from "vitest";
import { CodeGenContext } from "../codegen-context.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";

function makeModel(shapes: SmithyAstModel["shapes"]): SmithyAstModel {
  return { shapes };
}

describe("CodeGenContext map shape generation", () => {
  it("generates a map schema using generated key and value targets", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#TagKey": { type: "string" },
        "com.amazonaws.s3#TagValue": { type: "string" },
        "com.amazonaws.s3#TagMap": {
          type: "map",
          key: { target: "com.amazonaws.s3#TagKey" },
          value: { target: "com.amazonaws.s3#TagValue" },
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas") ?? "";

    expect(output).toContain(
      "export const tagMapSchema = z.record(tagKeySchema, tagValueSchema);",
    );
  });

  it("maps builtin targets for key and value", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#BuiltinMap": {
          type: "map",
          key: { target: "smithy.api#String" },
          value: { target: "smithy.api#Boolean" },
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas") ?? "";

    expect(output).toContain(
      "export const builtinMapSchema = z.record(z.string(), z.boolean());",
    );
  });

  it("falls back to z.unknown with a TODO when value target is unresolved", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#UnknownValueMap": {
          type: "map",
          key: { target: "smithy.api#String" },
          value: { target: "com.amazonaws.s3#MissingValue" },
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas") ?? "";

    expect(output).toContain(
      "// TODO: map value target com.amazonaws.s3#MissingValue is not generated yet.",
    );
    expect(output).toContain(
      "export const unknownValueMapSchema = z.record(z.string(), z.unknown());",
    );
  });

  it("throws when key target is unresolved", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#InvalidKeyMap": {
          type: "map",
          key: { target: "com.amazonaws.s3#MissingKey" },
          value: { target: "smithy.api#String" },
        },
      }),
    );

    expect(() => ctx.generate()).toThrow(
      "Map InvalidKeyMap key target com.amazonaws.s3#MissingKey is not generated yet.",
    );
  });

  it("throws when key target is not string-compatible", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#InvalidBuiltinKeyMap": {
          type: "map",
          key: { target: "smithy.api#Boolean" },
          value: { target: "smithy.api#String" },
        },
      }),
    );

    expect(() => ctx.generate()).toThrow(
      "Map InvalidBuiltinKeyMap key target smithy.api#Boolean is not string-compatible.",
    );
  });

  it("generates map shapes after list shapes", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#TagKey": { type: "string" },
        "com.amazonaws.s3#TagKeys": {
          type: "list",
          member: { target: "com.amazonaws.s3#TagKey" },
        },
        "com.amazonaws.s3#TagMap": {
          type: "map",
          key: { target: "com.amazonaws.s3#TagKey" },
          value: { target: "com.amazonaws.s3#TagKey" },
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas") ?? "";

    expect(
      output.indexOf("export const tagKeysSchema = z.array(tagKeySchema);"),
    ).toBeLessThan(
      output.indexOf(
        "export const tagMapSchema = z.record(tagKeySchema, tagKeySchema);",
      ),
    );
  });

  it("imports cross-namespace value targets", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.shared#SharedValue": { type: "string" },
        "com.amazonaws.s3#CrossNamespaceMap": {
          type: "map",
          key: { target: "smithy.api#String" },
          value: { target: "com.amazonaws.shared#SharedValue" },
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas") ?? "";

    expect(output).toContain(
      "export const crossNamespaceMapSchema = z.record(z.string(), sharedValueSchema);",
    );
  });
});

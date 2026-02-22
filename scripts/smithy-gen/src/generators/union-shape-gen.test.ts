import { describe, expect, it } from "vitest";
import { CodeGenContext } from "../codegen-context.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";

function makeModel(shapes: SmithyAstModel["shapes"]): SmithyAstModel {
  return { shapes };
}

describe("CodeGenContext union shape generation", () => {
  it("generates a union schema using generated member targets", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#TagKey": { type: "string" },
        "com.amazonaws.s3#TagValue": { type: "string" },
        "com.amazonaws.s3#TagUnion": {
          type: "union",
          traits: {},
          members: {
            Key: { target: "com.amazonaws.s3#TagKey", traits: {} },
            Value: { target: "com.amazonaws.s3#TagValue", traits: {} },
          },
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:schema") ?? "";

    expect(output).toContain(
      "export const tagUnionSchema = z.union([z.lazy(() => tagKeySchema), z.lazy(() => tagValueSchema)]);",
    );
  });

  it("maps builtin member targets", () => {
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
    const output = ctx.renderFiles().get("s3-schemas:schema") ?? "";

    expect(output).toContain(
      "export const builtinUnionSchema = z.union([z.string(), z.boolean()]);",
    );
  });

  it("falls back to z.unknown when member target is unresolved", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#UnknownMemberUnion": {
          type: "union",
          traits: {},
          members: {
            Missing: { target: "com.amazonaws.s3#MissingShape", traits: {} },
            Name: { target: "smithy.api#String", traits: {} },
          },
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:schema") ?? "";
    expect(output).toContain(
      "export const unknownMemberUnionSchema = z.union([z.unknown(), z.string()]);",
    );
  });

  it("imports cross-namespace member targets", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.shared#SharedValue": { type: "string" },
        "com.amazonaws.s3#CrossNamespaceUnion": {
          type: "union",
          traits: {},
          members: {
            Shared: { target: "com.amazonaws.shared#SharedValue", traits: {} },
            Name: { target: "smithy.api#String", traits: {} },
          },
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:schema") ?? "";

    expect(output).toContain(
      "export const crossNamespaceUnionSchema = z.union([sharedValueSchema, z.string()]);",
    );
  });

  it("generates union shapes after map shapes", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#TagKey": { type: "string" },
        "com.amazonaws.s3#TagMap": {
          type: "map",
          key: { target: "com.amazonaws.s3#TagKey" },
          value: { target: "com.amazonaws.s3#TagKey" },
        },
        "com.amazonaws.s3#TagUnion": {
          type: "union",
          traits: {},
          members: {
            TagMap: { target: "com.amazonaws.s3#TagMap", traits: {} },
            Key: { target: "com.amazonaws.s3#TagKey", traits: {} },
          },
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:schema") ?? "";

    expect(
      output.indexOf(
        "export const tagMapSchema = z.record(z.lazy(() => tagKeySchema), z.lazy(() => tagKeySchema));",
      ),
    ).toBeLessThan(
      output.indexOf(
        "export const tagUnionSchema = z.union([z.lazy(() => tagMapSchema), z.lazy(() => tagKeySchema)]);",
      ),
    );
  });

  it("uses z.unknown() for each unresolved member target", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#UnknownMembersUnion": {
          type: "union",
          traits: {},
          members: {
            MissingA: { target: "com.amazonaws.s3#MissingA", traits: {} },
            MissingB: { target: "com.amazonaws.s3#MissingB", traits: {} },
          },
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:schema") ?? "";
    expect(output).toContain(
      "export const unknownMembersUnionSchema = z.union([z.unknown(), z.unknown()]);",
    );
  });

  it("resolves forward references between union shapes", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#OuterUnion": {
          type: "union",
          traits: {},
          members: {
            Inner: { target: "com.amazonaws.s3#InnerUnion", traits: {} },
          },
        },
        "com.amazonaws.s3#InnerUnion": {
          type: "union",
          traits: {},
          members: {
            Name: { target: "smithy.api#String", traits: {} },
          },
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:schema") ?? "";

    expect(output).toContain(
      "export const outerUnionSchema = z.union([z.lazy(() => innerUnionSchema)]);",
    );
  });
});

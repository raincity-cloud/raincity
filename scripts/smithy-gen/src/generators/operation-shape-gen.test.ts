import { describe, expect, it } from "vitest";
import { CodeGenContext } from "../codegen-context.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";
import { ErrorTraitType } from "../traits/smithy-api.js";

function makeModel(shapes: SmithyAstModel["shapes"]): SmithyAstModel {
  return { shapes };
}

describe("CodeGenContext operation shape generation", () => {
  it("registers operation methods with typed input and output", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#GetObjectInput": {
          type: "structure",
          members: {},
          mixins: {},
        },
        "com.amazonaws.s3#GetObjectOutput": {
          type: "structure",
          members: {},
          mixins: {},
        },
        "com.amazonaws.s3#GetObject": {
          type: "operation",
          input: { target: "com.amazonaws.s3#GetObjectInput" },
          output: { target: "com.amazonaws.s3#GetObjectOutput" },
        },
      }),
    );

    ctx.generate();
    const method = ctx.getOperationMethod("com.amazonaws.s3#GetObject");

    expect(method?.methodName).toBe("getObject");
    expect(method?.tsDoc).toBeUndefined();
  });

  it("adds operation documentation and @throws entries from modeled errors", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#GetObjectInput": {
          type: "structure",
          members: {},
          mixins: {},
        },
        "com.amazonaws.s3#GetObjectOutput": {
          type: "structure",
          members: {},
          mixins: {},
        },
        "com.amazonaws.s3#NoSuchKey": {
          type: "structure",
          traits: {
            "smithy.api#documentation": "The specified key does not exist.",
            "smithy.api#error": ErrorTraitType.Client,
          },
          members: {},
          mixins: {},
        },
        "com.amazonaws.s3#InvalidState": {
          type: "structure",
          traits: {
            "smithy.api#error": ErrorTraitType.Server,
          },
          members: {},
          mixins: {},
        },
        "com.amazonaws.s3#GetObject": {
          type: "operation",
          traits: {
            "smithy.api#documentation": "Retrieves an object from S3.",
          },
          input: { target: "com.amazonaws.s3#GetObjectInput" },
          output: { target: "com.amazonaws.s3#GetObjectOutput" },
          errors: [
            { target: "com.amazonaws.s3#NoSuchKey" },
            { target: "com.amazonaws.s3#InvalidState" },
          ],
        },
      }),
    );

    ctx.generate();
    const method = ctx.getOperationMethod("com.amazonaws.s3#GetObject");

    expect(method?.tsDoc).toContain("* Retrieves an object from S3.");
    expect(method?.tsDoc).toContain(
      "* @throws {NoSuchKey} The specified key does not exist.",
    );
    expect(method?.tsDoc).toContain(
      "* @throws {InvalidState} This operation may throw InvalidState.",
    );
  });

  it("tracks unresolved input/output targets in operation method metadata", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#GetObject": {
          type: "operation",
          input: { target: "com.amazonaws.s3#MissingInput" },
          output: { target: "com.amazonaws.s3#MissingOutput" },
          errors: [{ target: "com.amazonaws.s3#MissingError" }],
        },
      }),
    );

    ctx.generate();
    const method = ctx.getOperationMethod("com.amazonaws.s3#GetObject");

    expect(method?.unresolvedComment).toContain(
      "com.amazonaws.s3#MissingInput",
    );
    expect(method?.unresolvedComment).toContain(
      "com.amazonaws.s3#MissingOutput",
    );
    expect(method?.tsDoc).toContain(
      "* @throws {unknown} This operation may throw an unknown error type (com.amazonaws.s3#MissingError).",
    );
  });

  it("does not emit operation functions directly", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#GetObjectInput": {
          type: "structure",
          members: {},
          mixins: {},
        },
        "com.amazonaws.s3#GetObjectOutput": {
          type: "structure",
          members: {},
          mixins: {},
        },
        "com.amazonaws.s3#GetObject": {
          type: "operation",
          input: { target: "com.amazonaws.s3#GetObjectInput" },
          output: { target: "com.amazonaws.s3#GetObjectOutput" },
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:structures") ?? "";

    expect(output).not.toContain("export function getObject(");
  });
});

import { describe, expect, it } from "vitest";
import { CodeGenContext } from "../codegen-context.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";
import { ErrorTraitType } from "../traits/smithy-api.js";

function makeModel(shapes: SmithyAstModel["shapes"]): SmithyAstModel {
  return { shapes };
}

describe("CodeGenContext error shape generation", () => {
  it("generates an error class with code, message, and httpStatus", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#NoSuchKey": {
          type: "structure",
          traits: {
            "smithy.api#error": ErrorTraitType.Client,
            "smithy.api#httpError": 404,
            "smithy.api#documentation": "The specified key does not exist.",
          },
          members: {},
          mixins: {},
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:errors") ?? "";

    expect(output).toContain("export class NoSuchKeyError extends AwsError");
    expect(output).toContain(
      'super("NoSuchKey", "The specified key does not exist.", 404)',
    );
    expect(output).toContain('this.name = "NoSuchKeyError"');
  });

  it("uses undefined for message when documentation trait is absent", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#NotFound": {
          type: "structure",
          traits: {
            "smithy.api#error": ErrorTraitType.Client,
            "smithy.api#httpError": 404,
          },
          members: {},
          mixins: {},
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:errors") ?? "";

    expect(output).toContain('super("NotFound", undefined, 404)');
  });

  it("uses undefined for httpStatus when httpError trait is absent", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#InternalError": {
          type: "structure",
          traits: {
            "smithy.api#error": ErrorTraitType.Server,
          },
          members: {},
          mixins: {},
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:errors") ?? "";

    expect(output).toContain('super("InternalError", undefined, undefined)');
  });

  it("imports AwsError from @raincity/aws-api-shared", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#NoSuchKey": {
          type: "structure",
          traits: {
            "smithy.api#error": ErrorTraitType.Client,
            "smithy.api#httpError": 404,
          },
          members: {},
          mixins: {},
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:errors") ?? "";

    expect(output).toContain(
      'import { AwsError } from "@raincity/aws-api-shared"',
    );
  });

  it("does not generate error shapes in the structures file", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#NoSuchKey": {
          type: "structure",
          traits: {
            "smithy.api#error": ErrorTraitType.Client,
            "smithy.api#httpError": 404,
          },
          members: {},
          mixins: {},
        },
      }),
    );

    ctx.generate();
    const structuresOutput =
      ctx.renderFiles().get("s3-schemas:structures") ?? "";

    expect(structuresOutput).toBe("");
  });

  it("separates error shapes from regular structure shapes", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#TagKey": { type: "string" },
        "com.amazonaws.s3#Tag": {
          type: "structure",
          members: {
            Key: {
              target: "com.amazonaws.s3#TagKey",
              traits: { "smithy.api#required": {} },
            },
          },
          mixins: {},
        },
        "com.amazonaws.s3#NoSuchKey": {
          type: "structure",
          traits: {
            "smithy.api#error": ErrorTraitType.Client,
            "smithy.api#httpError": 404,
            "smithy.api#documentation": "The specified key does not exist.",
          },
          members: {},
          mixins: {},
        },
      }),
    );

    ctx.generate();
    const structuresOutput =
      ctx.renderFiles().get("s3-schemas:structures") ?? "";
    const errorsOutput = ctx.renderFiles().get("s3-schemas:errors") ?? "";

    expect(structuresOutput).toContain("export const tagSchema");
    expect(structuresOutput).not.toContain("NoSuchKey");
    expect(errorsOutput).toContain("export class NoSuchKeyError");
    expect(errorsOutput).not.toContain("tagSchema");
  });

  it("uses PascalCase with Error suffix for class names", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#bucket_already_exists": {
          type: "structure",
          traits: {
            "smithy.api#error": ErrorTraitType.Client,
            "smithy.api#httpError": 409,
          },
          members: {},
          mixins: {},
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:errors") ?? "";

    expect(output).toContain(
      "export class BucketAlreadyExistsError extends AwsError",
    );
  });

  it("preserves the original shape name as the error code", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#bucket_already_exists": {
          type: "structure",
          traits: {
            "smithy.api#error": ErrorTraitType.Client,
            "smithy.api#httpError": 409,
          },
          members: {},
          mixins: {},
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:errors") ?? "";

    expect(output).toContain('"bucket_already_exists"');
  });

  it("generates multiple error classes in the same file", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#NoSuchKey": {
          type: "structure",
          traits: {
            "smithy.api#error": ErrorTraitType.Client,
            "smithy.api#httpError": 404,
          },
          members: {},
          mixins: {},
        },
        "com.amazonaws.s3#NoSuchBucket": {
          type: "structure",
          traits: {
            "smithy.api#error": ErrorTraitType.Client,
            "smithy.api#httpError": 404,
          },
          members: {},
          mixins: {},
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:errors") ?? "";

    expect(output).toContain("export class NoSuchKeyError extends AwsError");
    expect(output).toContain("export class NoSuchBucketError extends AwsError");
  });

  it("resolves error shape type names with Error suffix in operation @throws", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#NoSuchKey": {
          type: "structure",
          traits: {
            "smithy.api#error": ErrorTraitType.Client,
            "smithy.api#httpError": 404,
            "smithy.api#documentation": "The specified key does not exist.",
          },
          members: {},
          mixins: {},
        },
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
          errors: [{ target: "com.amazonaws.s3#NoSuchKey" }],
        },
        "com.amazonaws.s3#S3": {
          type: "service",
          version: "2006-03-01",
          operations: [{ target: "com.amazonaws.s3#GetObject" }],
          traits: {
            "smithy.api#documentation": "Amazon S3",
          },
        },
      }),
    );

    ctx.generate();
    const serviceOutput = ctx.renderFiles().get("s3-schemas:service") ?? "";

    expect(serviceOutput).toContain("@throws {NoSuchKeyError}");
    expect(serviceOutput).not.toContain("@throws {NoSuchKey}");
  });
});

import { describe, expect, it } from "vitest";
import { CodeGenContext } from "../codegen-context.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";
import { ErrorTraitType } from "../traits/smithy-api.js";

function makeModel(shapes: SmithyAstModel["shapes"]): SmithyAstModel {
  return { shapes };
}

describe("CodeGenContext service shape generation", () => {
  it("generates service interfaces with camelCase operation methods", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#GetObjectRequest": {
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
          input: { target: "com.amazonaws.s3#GetObjectRequest" },
          output: { target: "com.amazonaws.s3#GetObjectOutput" },
        },
        "com.amazonaws.s3#AmazonS3": {
          type: "service",
          version: "2006-03-01",
          operations: [{ target: "com.amazonaws.s3#GetObject" }],
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:service") ?? "";

    expect(output).toContain("export interface AmazonS3Service {");
    expect(output).toContain(
      "getObject(input: z.infer<typeof getObjectRequestSchema>): z.infer<typeof getObjectOutputSchema>;",
    );
  });

  it("adds operation documentation and throws entries to service methods", () => {
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
        "com.amazonaws.s3#GetObject": {
          type: "operation",
          traits: {
            "smithy.api#documentation": "Retrieves an object from S3.",
          },
          input: { target: "com.amazonaws.s3#GetObjectInput" },
          output: { target: "com.amazonaws.s3#GetObjectOutput" },
          errors: [{ target: "com.amazonaws.s3#NoSuchKey" }],
        },
        "com.amazonaws.s3#AmazonS3": {
          type: "service",
          version: "2006-03-01",
          operations: [{ target: "com.amazonaws.s3#GetObject" }],
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:service") ?? "";

    expect(output).toContain("* Retrieves an object from S3.");
    expect(output).toContain(
      "* @throws {NoSuchKey} The specified key does not exist.",
    );
  });

  it("inserts a blank line between service methods", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#GetObjectRequest": {
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
          input: { target: "com.amazonaws.s3#GetObjectRequest" },
          output: { target: "com.amazonaws.s3#GetObjectOutput" },
        },
        "com.amazonaws.s3#PutObjectRequest": {
          type: "structure",
          members: {},
          mixins: {},
        },
        "com.amazonaws.s3#PutObjectOutput": {
          type: "structure",
          members: {},
          mixins: {},
        },
        "com.amazonaws.s3#PutObject": {
          type: "operation",
          input: { target: "com.amazonaws.s3#PutObjectRequest" },
          output: { target: "com.amazonaws.s3#PutObjectOutput" },
        },
        "com.amazonaws.s3#AmazonS3": {
          type: "service",
          version: "2006-03-01",
          operations: [
            { target: "com.amazonaws.s3#GetObject" },
            { target: "com.amazonaws.s3#PutObject" },
          ],
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:service") ?? "";

    expect(output).toContain(
      "getObject(input: z.infer<typeof getObjectRequestSchema>): z.infer<typeof getObjectOutputSchema>;\n\n  putObject(input: z.infer<typeof putObjectRequestSchema>): z.infer<typeof putObjectOutputSchema>;",
    );
  });

  it("keeps unresolved operation signatures typed as unknown after tsdoc", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#KnownInput": {
          type: "structure",
          members: {},
          mixins: {},
        },
        "com.amazonaws.s3#GetObject": {
          type: "operation",
          traits: {
            "smithy.api#documentation": "Retrieves an object from S3.",
          },
          input: { target: "com.amazonaws.s3#KnownInput" },
          output: { target: "com.amazonaws.s3#MissingOutput" },
        },
        "com.amazonaws.s3#AmazonS3": {
          type: "service",
          version: "2006-03-01",
          operations: [{ target: "com.amazonaws.s3#GetObject" }],
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:service") ?? "";
    const tsDocIndex = output.indexOf(" * Retrieves an object from S3.");
    const methodIndex = output.indexOf("getObject(input:");

    expect(tsDocIndex).toBeGreaterThan(-1);
    expect(methodIndex).toBeGreaterThan(tsDocIndex);
    expect(output).toContain(
      "getObject(input: z.infer<typeof knownInputSchema>): unknown;",
    );
  });

  it("imports cross-namespace operation input and output types", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.shared#SharedInput": {
          type: "structure",
          members: {},
          mixins: {},
        },
        "com.amazonaws.shared#SharedOutput": {
          type: "structure",
          members: {},
          mixins: {},
        },
        "com.amazonaws.s3#CrossNamespaceOperation": {
          type: "operation",
          input: { target: "com.amazonaws.shared#SharedInput" },
          output: { target: "com.amazonaws.shared#SharedOutput" },
        },
        "com.amazonaws.s3#AmazonS3": {
          type: "service",
          version: "2006-03-01",
          operations: [{ target: "com.amazonaws.s3#CrossNamespaceOperation" }],
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:service") ?? "";

    expect(output).toContain(
      'import { sharedInputSchema, sharedOutputSchema } from "./com.amazonaws.shared.structures.js";',
    );
    expect(output).toContain(
      "crossNamespaceOperation(input: z.infer<typeof sharedInputSchema>): z.infer<typeof sharedOutputSchema>;",
    );
  });

  it("falls back to unknown methods for unresolved service operation targets", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#AmazonS3": {
          type: "service",
          version: "2006-03-01",
          operations: [{ target: "com.amazonaws.s3#MissingOperation" }],
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:service") ?? "";

    expect(output).toContain("missingOperation(input: unknown): unknown;");
  });

  it("uses only operations referenced by the service and emits interfaces after schemas", () => {
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
        "com.amazonaws.s3#DeleteObjectInput": {
          type: "structure",
          members: {},
          mixins: {},
        },
        "com.amazonaws.s3#DeleteObjectOutput": {
          type: "structure",
          members: {},
          mixins: {},
        },
        "com.amazonaws.s3#DeleteObject": {
          type: "operation",
          input: { target: "com.amazonaws.s3#DeleteObjectInput" },
          output: { target: "com.amazonaws.s3#DeleteObjectOutput" },
        },
        "com.amazonaws.s3#AmazonS3": {
          type: "service",
          version: "2006-03-01",
          operations: [{ target: "com.amazonaws.s3#GetObject" }],
        },
      }),
    );

    ctx.generate();
    const serviceOutput = ctx.renderFiles().get("s3-schemas:service") ?? "";
    const structuresOutput =
      ctx.renderFiles().get("s3-schemas:structures") ?? "";

    expect(structuresOutput).toContain(
      "export const getObjectInputSchema = z.object({});",
    );
    expect(serviceOutput).toContain("export interface AmazonS3Service {");
    expect(serviceOutput).toContain("getObject(input:");
    expect(serviceOutput).not.toContain("deleteObject(input:");
  });

  it("inserts a blank line between service shapes in the same file", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#AmazonS3": {
          type: "service",
          version: "2006-03-01",
          operations: [],
        },
        "com.amazonaws.s3#S3Control": {
          type: "service",
          version: "2018-08-20",
          operations: [],
        },
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:service") ?? "";

    expect(output).toContain(
      "export interface AmazonS3Service {}\n\nexport interface S3ControlService {}",
    );
  });
});

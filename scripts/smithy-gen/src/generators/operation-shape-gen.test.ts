import { describe, expect, it } from "vitest";
import { CodeGenContext } from "../codegen-context.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";
import { ErrorTraitType } from "../traits/smithy-api.js";

function makeModel(shapes: SmithyAstModel["shapes"]): SmithyAstModel {
  return { shapes };
}

describe("CodeGenContext operation shape generation", () => {
  it("generates operation functions with typed input and output", () => {
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
    const output = ctx.renderFiles().get("s3-schemas") ?? "";

    expect(output).toContain(
      "export function getObject(_input: z.infer<typeof getObjectInputSchema>): z.infer<typeof getObjectOutputSchema> {",
    );
    expect(output).toContain(
      'throw new Error("Operation GetObject is not implemented.");',
    );
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
    const output = ctx.renderFiles().get("s3-schemas") ?? "";

    expect(output).toContain("* Retrieves an object from S3.");
    expect(output).toContain(
      "* @throws {NoSuchKey} The specified key does not exist.",
    );
    expect(output).toContain(
      "* @throws {InvalidState} This operation may throw InvalidState.",
    );
  });

  it("falls back to unknown for unresolved input, output, and error targets", () => {
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
    const output = ctx.renderFiles().get("s3-schemas") ?? "";

    expect(output).toContain(
      "export function getObject(_input: unknown): unknown {",
    );
    expect(output).toContain(
      "* @throws {unknown} This operation may throw an unknown error type (com.amazonaws.s3#MissingError).",
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
      }),
    );

    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas") ?? "";

    expect(output).toContain(
      'import { sharedInputSchema, sharedOutputSchema } from "./common-schemas:com.amazonaws.shared";',
    );
    expect(output).toContain(
      "export function crossNamespaceOperation(_input: z.infer<typeof sharedInputSchema>): z.infer<typeof sharedOutputSchema> {",
    );
  });

  it("generates operations after other shape types", () => {
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
    const output = ctx.renderFiles().get("s3-schemas") ?? "";

    expect(
      output.indexOf("export const getObjectInputSchema = z.object({});"),
    ).toBeLessThan(
      output.indexOf(
        "export function getObject(_input: z.infer<typeof getObjectInputSchema>): z.infer<typeof getObjectOutputSchema> {",
      ),
    );
  });
});

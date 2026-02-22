import { describe, expect, it } from "vitest";
import { CodeGenContext } from "../codegen-context.js";
import type { TimestampShape } from "../shapes/timestamp-shape.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";

function makeModel(shapes: Record<string, TimestampShape>): SmithyAstModel {
  return { shapes };
}

describe("CodeGenContext timestamp shape generation", () => {
  it("generates a date-time timestamp schema", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#CreatedAt": {
          type: "timestamp",
          traits: { "smithy.api#timestampFormat": "date-time" },
        },
      }),
    );
    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:schema") ?? "";
    expect(output).toContain('from "@raincity/aws-api-shared";');
    expect(output).toContain(
      "export const createdAtSchema = rfc3339DateTimeTimestampSchema;",
    );
  });

  it("generates an http-date timestamp schema", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#LastModified": {
          type: "timestamp",
          traits: { "smithy.api#timestampFormat": "http-date" },
        },
      }),
    );
    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:schema") ?? "";
    expect(output).toContain('from "@raincity/aws-api-shared";');
    expect(output).toContain(
      "export const lastModifiedSchema = imfFixdateTimestampSchema;",
    );
  });

  it("defaults missing timestamp format to date-time for s3-schemas", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.s3#MissingFormat": {
          type: "timestamp",
          traits: {},
        },
      }),
    );
    ctx.generate();
    const output = ctx.renderFiles().get("s3-schemas:schema") ?? "";
    expect(output).toContain(
      "export const missingFormatSchema = rfc3339DateTimeTimestampSchema;",
    );
    expect(output).not.toContain("imfFixdateTimestampSchema");
  });

  it("defaults missing timestamp format to date-time for common-schemas:com.amazonaws.shared", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.shared#SharedMissingFormat": {
          type: "timestamp",
          traits: {},
        },
      }),
    );
    ctx.generate();
    const output =
      ctx.renderFiles().get("common-schemas:com.amazonaws.shared:schema") ?? "";
    expect(output).toContain('from "../timestamp-schema-helpers.js";');
    expect(output).toContain(
      "export const sharedMissingFormatSchema = rfc3339DateTimeTimestampSchema;",
    );
    expect(output).not.toContain("imfFixdateTimestampSchema");
  });

  it("routes non-S3 timestamp shapes to common-schemas:com.amazonaws.shared", () => {
    const ctx = new CodeGenContext(
      makeModel({
        "com.amazonaws.shared#SharedTime": {
          type: "timestamp",
          traits: { "smithy.api#timestampFormat": "date-time" },
        },
      }),
    );
    ctx.generate();
    const files = ctx.renderFiles();
    expect(files.has("common-schemas:com.amazonaws.shared:schema")).toBe(true);
    expect(files.has("s3-schemas:schema")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { CodeGenContext } from "../codegen-context.js";
import type { TimestampShape } from "../shapes/timestamp-shape.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";
import { createTimestampSchemaForFormat } from "./timestamp-shape-gen.js";

function makeModel(shapes: Record<string, TimestampShape>): SmithyAstModel {
  return { shapes };
}

describe("createTimestampSchemaForFormat(date-time)", () => {
  const schema = createTimestampSchemaForFormat("date-time");

  it("accepts date-time without milliseconds and normalizes to UTC milliseconds", () => {
    expect(schema.parse("1985-04-12T23:20:50Z")).toBe(
      "1985-04-12T23:20:50.000Z",
    );
  });

  it("accepts date-time with milliseconds", () => {
    expect(schema.parse("1985-04-12T23:20:50.520Z")).toBe(
      "1985-04-12T23:20:50.520Z",
    );
  });

  it("accepts positive timezone offsets and converts to UTC", () => {
    expect(schema.parse("1985-04-12T23:20:50+01:00")).toBe(
      "1985-04-12T22:20:50.000Z",
    );
  });

  it("accepts negative timezone offsets and converts to UTC", () => {
    expect(schema.parse("1985-04-12T23:20:50-02:30")).toBe(
      "1985-04-13T01:50:50.000Z",
    );
  });

  it("truncates fractional precision beyond milliseconds", () => {
    expect(schema.parse("1985-04-12T23:20:50.123456Z")).toBe(
      "1985-04-12T23:20:50.123Z",
    );
  });
});

describe("createTimestampSchemaForFormat(http-date)", () => {
  const schema = createTimestampSchemaForFormat("http-date");

  it("accepts IMF-fixdate values", () => {
    expect(schema.parse("Tue, 29 Apr 2014 18:30:38 GMT")).toBe(
      "Tue, 29 Apr 2014 18:30:38 GMT",
    );
  });

  it("rejects http-date with fractional seconds", () => {
    expect(() => schema.parse("Tue, 29 Apr 2014 18:30:38.123 GMT")).toThrow(
      "Invalid string: must match pattern",
    );
  });

  it("rejects non-GMT timezones", () => {
    expect(() => schema.parse("Tue, 29 Apr 2014 18:30:38 UTC")).toThrow(
      "Invalid string: must match pattern",
    );
    expect(() => schema.parse("Tue, 29 Apr 2014 18:30:38 +0000")).toThrow(
      "Invalid string: must match pattern",
    );
  });
});

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
    const output = ctx.renderFiles().get("s3-schemas") ?? "";
    expect(output).toContain("export const createdAtSchema = z.string()");
    expect(output).toContain("Invalid RFC3339 date-time timestamp");
    expect(output).toContain("toISOString()");
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
    const output = ctx.renderFiles().get("s3-schemas") ?? "";
    expect(output).toContain("export const lastModifiedSchema = z.string()");
    expect(output).toContain("Invalid IMF-fixdate timestamp");
    expect(output).toContain("GMT");
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
    const output = ctx.renderFiles().get("s3-schemas") ?? "";
    expect(output).toContain("export const missingFormatSchema = z.string()");
    expect(output).toContain("Invalid RFC3339 date-time timestamp");
    expect(output).toContain("toISOString()");
    expect(output).not.toContain("Invalid IMF-fixdate timestamp");
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
      ctx.renderFiles().get("common-schemas:com.amazonaws.shared") ?? "";
    expect(output).toContain(
      "export const sharedMissingFormatSchema = z.string()",
    );
    expect(output).toContain("Invalid RFC3339 date-time timestamp");
    expect(output).toContain("toISOString()");
    expect(output).not.toContain("Invalid IMF-fixdate timestamp");
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
    expect(files.has("common-schemas:com.amazonaws.shared")).toBe(true);
    expect(files.has("s3-schemas")).toBe(false);
  });
});

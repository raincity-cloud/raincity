import { describe, expect, it } from "vitest";
import {
  imfFixdateTimestampSchema,
  rfc3339DateTimeTimestampSchema,
} from "./timestamp-schema-helpers.js";

describe("rfc3339DateTimeTimestampSchema", () => {
  const schema = rfc3339DateTimeTimestampSchema;

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

describe("imfFixdateTimestampSchema", () => {
  const schema = imfFixdateTimestampSchema;

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

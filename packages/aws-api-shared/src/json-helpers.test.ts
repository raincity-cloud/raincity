import { describe, expect, it } from "vitest";
import { jsonParseSafe, jsonStringifySafe } from "./json-helpers.js";

function assertIsObjectRecord(
  value: unknown,
): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Expected parsed JSON object");
  }
}

function assertIsUnknownArray(value: unknown): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError("Expected JSON array");
  }
}

function parseObject(text: string): Record<string, unknown> {
  const parsed = jsonParseSafe(text);
  assertIsObjectRecord(parsed);
  return parsed;
}

describe("jsonParseSafe", () => {
  it("should keep small integers as numbers", () => {
    const json = '{"small": 42, "negative": -100}';
    const result = parseObject(json);
    expect(result).toEqual({ small: 42, negative: -100 });
    expect(typeof result["small"]).toBe("number");
    expect(typeof result["negative"]).toBe("number");
  });

  it("should keep floats as numbers", () => {
    // oxlint-disable-next-line approx-constant
    const json = '{"approxPi": 3.14159, "exp": 1e10, "negFloat": -2.5}';
    const result = parseObject(json);
    // oxlint-disable-next-line approx-constant
    expect(result).toEqual({ approxPi: 3.14159, exp: 1e10, negFloat: -2.5 });
    expect(typeof result["approxPi"]).toBe("number");
    expect(typeof result["exp"]).toBe("number");
  });

  it("should convert large positive integers to BigInt", () => {
    const largeInt = BigInt(Number.MAX_SAFE_INTEGER) + 1000n;
    const json = `{"large": ${largeInt}}`;
    const result = parseObject(json);
    expect(result["large"]).toBe(largeInt);
    expect(typeof result["large"]).toBe("bigint");
  });

  it("should convert large negative integers to BigInt", () => {
    const largeNegInt = BigInt(Number.MIN_SAFE_INTEGER) - 1000n;
    const json = `{"large": ${largeNegInt}}`;
    const result = parseObject(json);
    expect(result["large"]).toBe(largeNegInt);
    expect(typeof result["large"]).toBe("bigint");
  });

  it("should handle MAX_SAFE_INTEGER boundary correctly", () => {
    const maxSafe = Number.MAX_SAFE_INTEGER;
    const beyondMax = BigInt(Number.MAX_SAFE_INTEGER) + 1n;

    const jsonSafe = `{"value": ${maxSafe}}`;
    const jsonBeyond = `{"value": ${beyondMax}}`;

    const resultSafe = parseObject(jsonSafe);
    const resultBeyond = parseObject(jsonBeyond);

    expect(typeof resultSafe["value"]).toBe("number");
    expect(resultSafe["value"]).toBe(maxSafe);

    expect(typeof resultBeyond["value"]).toBe("bigint");
    expect(resultBeyond["value"]).toBe(beyondMax);
  });

  it("should not affect strings, booleans, or null", () => {
    const json = '{"str": "hello", "bool": true, "nul": null}';
    const result = parseObject(json);
    expect(result).toEqual({ str: "hello", bool: true, nul: null });
  });

  it("should handle nested objects and arrays", () => {
    const json = `{
			"nested": {
				"small": 100,
				"large": 9007199254740992,
				"arr": [1, 2.5, 9007199254740992]
			}
		}`;
    const result = parseObject(json);
    const nested = result["nested"];
    assertIsObjectRecord(nested);
    const arr = nested["arr"];
    assertIsUnknownArray(arr);

    expect(typeof nested["small"]).toBe("number");
    expect(typeof nested["large"]).toBe("bigint");
    expect(nested["large"]).toBe(9007199254740992n);

    expect(typeof arr[0]).toBe("number");
    expect(typeof arr[1]).toBe("number");
    expect(typeof arr[2]).toBe("bigint");
  });
});

describe("jsonStringifySafe", () => {
  it("should serialize regular values normally", () => {
    const obj = { num: 42, str: "hello", bool: true, nul: null };
    const result = jsonStringifySafe(obj);
    expect(result).toBe('{"num":42,"str":"hello","bool":true,"nul":null}');
  });

  it("should serialize BigInt as numeric literals (not strings)", () => {
    const obj = { large: 9007199254740992n };
    const result = jsonStringifySafe(obj);
    expect(result).toBe('{"large":9007199254740992}');
    expect(result).not.toContain('"9007199254740992"');
  });

  it("should handle negative BigInt values", () => {
    const obj = { negative: -9007199254740992n };
    const result = jsonStringifySafe(obj);
    expect(result).toBe('{"negative":-9007199254740992}');
  });

  it("should handle mixed types in objects", () => {
    const obj = {
      small: 100,
      large: 9007199254740992n,
      str: "test",
    };
    const result = jsonStringifySafe(obj);
    expect(result).toBe('{"small":100,"large":9007199254740992,"str":"test"}');
  });

  it("should handle arrays with BigInt values", () => {
    const arr = [1, 2n, 9007199254740992n, "text"];
    const result = jsonStringifySafe(arr);
    expect(result).toBe('[1,2,9007199254740992,"text"]');
  });

  it("should support pretty-printing with space parameter", () => {
    const obj = { large: 123n };
    const result = jsonStringifySafe(obj, 2);
    expect(result).toBe('{\n  "large": 123\n}');
  });
});

describe("round-trip (parse + stringify)", () => {
  it("should preserve large integer precision", () => {
    const original = `{"id": 9007199254740995, "count": 42}`;
    const parsed = parseObject(original);
    const stringified = jsonStringifySafe(parsed);

    expect(parsed["id"]).toBe(9007199254740995n);
    expect(parsed["count"]).toBe(42);
    expect(stringified).toBe('{"id":9007199254740995,"count":42}');

    // Verify round-trip maintains precision
    const reparsed = parseObject(stringified);
    expect(reparsed["id"]).toBe(parsed["id"]);
    expect(reparsed["count"]).toBe(parsed["count"]);
  });

  it("should handle very large integers without precision loss", () => {
    const veryLarge = "12345678901234567890";
    const original = `{"value": ${veryLarge}}`;
    const parsed = parseObject(original);
    const stringified = jsonStringifySafe(parsed);

    expect(parsed["value"]).toBe(BigInt(veryLarge));
    expect(stringified).toBe(`{"value":${veryLarge}}`);
  });

  it("should preserve mixed number and BigInt values", () => {
    const original = `{"small": 123, "large": 9007199254741000, "float": 3.14}`;
    const parsed = parseObject(original);
    const stringified = jsonStringifySafe(parsed);

    expect(typeof parsed["small"]).toBe("number");
    expect(typeof parsed["large"]).toBe("bigint");
    expect(typeof parsed["float"]).toBe("number");

    expect(stringified).toBe(
      '{"small":123,"large":9007199254741000,"float":3.14}',
    );
  });
});

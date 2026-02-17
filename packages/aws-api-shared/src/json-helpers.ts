/**
 * JSON parsing and stringification helpers that preserve precision for 64-bit integers.
 *
 * Standard JSON.parse truncates numbers exceeding Number.MAX_SAFE_INTEGER (2^53-1).
 * These helpers automatically convert large integers to BigInt while keeping small
 * numbers as regular number values.
 */

const INTEGER_LITERAL_REGEX = /^-?\d+$/;

interface JsonParseSourceContext {
  readonly source: string;
}

type JsonParseReviver = (
  this: unknown,
  key: string,
  value: unknown,
  context?: JsonParseSourceContext,
) => unknown;

// Type definitions for Node 24 JSON features (not yet in TypeScript lib)
declare global {
  interface JSON {
    rawJSON(text: string): unknown;
    isRawJSON(value: unknown): boolean;
    parse(text: string, reviver?: JsonParseReviver): unknown;
  }
}

function safeIntegerReviver(
  _key: string,
  value: unknown,
  context?: JsonParseSourceContext,
): unknown {
  // Only process numbers with source context available
  if (typeof value !== "number" || context === undefined) {
    return value;
  }

  const { source } = context;

  // Only convert plain integer literals (not floats or exponent notation)
  if (!INTEGER_LITERAL_REGEX.test(source)) {
    return value;
  }

  return Number.isSafeInteger(value) ? value : BigInt(source);
}

function bigintReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return JSON.rawJSON(value.toString());
  }

  return value;
}

/**
 * Safely parse JSON, converting large integers to BigInt automatically.
 *
 * - Small integers remain as `number`
 * - Large integers (outside Number.MAX_SAFE_INTEGER range) become `bigint`
 * - Floats always remain as `number`
 * - Other types (strings, booleans, null, objects, arrays) are unaffected
 *
 * @param text - JSON string to parse
 * @returns Parsed value with large integers as BigInt
 */
export function jsonParseSafe(text: string): unknown {
  return JSON.parse(text, safeIntegerReviver);
}

/**
 * Safely stringify values containing BigInt, emitting them as numeric literals.
 *
 * - BigInt values are serialized as raw numbers (not strings)
 * - All other types are serialized normally
 *
 * @param value - Value to stringify
 * @param space - Indentation for pretty-printing (optional)
 * @returns JSON string with BigInt values as numeric literals
 */
export function jsonStringifySafe(
  value: unknown,
  space?: number | string,
): string {
  return JSON.stringify(value, bigintReplacer, space);
}

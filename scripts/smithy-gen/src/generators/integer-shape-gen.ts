import type { CodeGenContext } from "../codegen-context.js";
import type { IntegerShape } from "../shapes/integer-shape.js";

interface IntegerShapeEntry {
  key: string;
  shape: IntegerShape;
}

export function buildConstraintChain(traits: IntegerShape["traits"]): string {
  if (!traits) return "";

  const parts: string[] = [];
  const range = traits["smithy.api#range"];
  if (range) {
    if (range.min !== undefined) parts.push(`.min(${String(range.min)})`);
    if (range.max !== undefined) parts.push(`.max(${String(range.max)})`);
  }

  return parts.join("");
}

export function generateIntegerShapes(
  _ctx: CodeGenContext,
  _shapes: IntegerShapeEntry[],
): void {
  // Integer shapes are inlined at usage sites.
}

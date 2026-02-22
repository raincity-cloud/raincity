import type { CodeGenContext } from "../codegen-context.js";
import type { StringShape } from "../shapes/string-shape.js";

interface StringShapeEntry {
  key: string;
  shape: StringShape;
}

export function buildConstraintChain(traits: StringShape["traits"]): string {
  if (!traits) return "";

  const parts: string[] = [];

  const length = traits["smithy.api#length"];
  if (length) {
    if (length.min !== undefined) {
      parts.push(`.min(${String(length.min)})`);
    }
    if (length.max !== undefined) {
      parts.push(`.max(${String(length.max)})`);
    }
  }

  const pattern = traits["smithy.api#pattern"];
  if (pattern) {
    parts.push(`.regex(new RegExp(${JSON.stringify(pattern)}))`);
  }

  return parts.join("");
}

export function generateStringShapes(
  _ctx: CodeGenContext,
  _shapes: StringShapeEntry[],
): void {
  // String shapes are inlined at usage sites.
}

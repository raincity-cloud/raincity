import { camelCase } from "lodash-es";
import { code, def, imp } from "ts-poet";
import type { CodeGenContext } from "../codegen-context.js";
import type { IntegerShape } from "../shapes/integer-shape.js";

const zImp = imp("z@zod/v4");

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
  ctx: CodeGenContext,
  shapes: IntegerShapeEntry[],
): void {
  for (const { key, shape } of shapes) {
    const { name } = ctx.parseShapeKey(key);
    const fileKey = ctx.getOutputFile(key);
    const schemaName = `${camelCase(name)}Schema`;
    const constraints = buildConstraintChain(shape.traits);

    const schemaCode = code`export const ${def(schemaName)} = ${zImp}.number()${constraints};`;

    ctx.addCode(fileKey, schemaCode);
  }
}

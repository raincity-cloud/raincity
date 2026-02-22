import { camelCase } from "lodash-es";
import { code, def, imp } from "ts-poet";
import type { CodeGenContext } from "../codegen-context.js";
import type { LongShape } from "../shapes/long-shape.js";

const zImp = imp("z@zod/v4");

interface LongShapeEntry {
  key: string;
  shape: LongShape;
}

export function generateLongShapes(
  ctx: CodeGenContext,
  shapes: LongShapeEntry[],
): void {
  for (const { key } of shapes) {
    const { name } = ctx.parseShapeKey(key);
    const fileKey = ctx.getOutputFile(key);
    const schemaName = `${camelCase(name)}Schema`;

    const schemaCode = code`export const ${def(schemaName)} = ${zImp}.bigint();`;

    ctx.addCode(fileKey, schemaCode);
  }
}

import { camelCase } from "lodash-es";
import { code, def, imp } from "ts-poet";
import type { CodeGenContext } from "../codegen-context.js";
import type { BooleanShape } from "../shapes/boolean-shape.js";

const zImp = imp("z@zod/v4");

interface BooleanShapeEntry {
  key: string;
  shape: BooleanShape;
}

export function generateBooleanShapes(
  ctx: CodeGenContext,
  shapes: BooleanShapeEntry[],
): void {
  for (const { key } of shapes) {
    const { name } = ctx.parseShapeKey(key);
    const fileKey = ctx.getOutputFile(key);
    const schemaName = `${camelCase(name)}Schema`;

    const schemaCode = code`export const ${def(schemaName)} = ${zImp}.boolean();`;

    ctx.addCode(fileKey, schemaCode);
    ctx.registerShape(key, imp(`${schemaName}@${ctx.getImportPath(fileKey)}`));
  }
}

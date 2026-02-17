import { camelCase } from "lodash-es";
import { code, def, imp } from "ts-poet";
import type { CodeGenContext } from "../codegen-context.js";
import type { BlobShape } from "../shapes/blob-shape.js";

const zImp = imp("z@zod/v4");

interface BlobShapeEntry {
  key: string;
  shape: BlobShape;
}

export function generateBlobShapes(
  ctx: CodeGenContext,
  shapes: BlobShapeEntry[],
): void {
  for (const { key } of shapes) {
    const { name } = ctx.parseShapeKey(key);
    const fileKey = ctx.getOutputFile(key);
    const schemaName = `${camelCase(name)}Schema`;

    const schemaCode = code`export const ${def(schemaName)} = ${zImp}.instanceof(Uint8Array);`;

    ctx.addCode(fileKey, schemaCode);
    ctx.registerShape(key, imp(`${schemaName}@./${fileKey}`));
  }
}

import { camelCase } from "lodash-es";
import { code, def, imp } from "ts-poet";
import type { CodeGenContext } from "../codegen-context.js";
import type { MapShape } from "../shapes/map-shape.js";

const zImp = imp("z@zod/v4");

interface MapShapeEntry {
  key: string;
  shape: MapShape;
}

type SchemaExpr = string | ReturnType<typeof imp> | ReturnType<typeof code>;

function isStringCompatibleBuiltinTarget(target: string): boolean {
  return target === "smithy.api#String";
}

function resolveMapKeySchemaExpr(
  ctx: CodeGenContext,
  shapeName: string,
  keyTarget: string,
  fileKey: string,
  currentShapeKey: string,
): SchemaExpr {
  const resolution = ctx.resolveSchemaReference(keyTarget, fileKey, {
    currentShapeKey,
    lazyForSameFile: true,
  });
  if (!resolution.resolved) {
    return code`${zImp}.string()`;
  }

  if (resolution.shapeType !== undefined) {
    if (resolution.shapeType === "string" || resolution.shapeType === "enum") {
      return resolution.expr;
    }
    throw new Error(
      `Map ${shapeName} key target ${keyTarget} is not string-compatible.`,
    );
  }

  if (!isStringCompatibleBuiltinTarget(keyTarget)) {
    throw new Error(
      `Map ${shapeName} key target ${keyTarget} is not string-compatible.`,
    );
  }

  return resolution.expr;
}

function resolveMapValueSchemaExpr(
  ctx: CodeGenContext,
  valueTarget: string,
  fileKey: string,
  currentShapeKey: string,
): SchemaExpr {
  return ctx.resolveSchemaReference(valueTarget, fileKey, {
    currentShapeKey,
    lazyForSameFile: true,
  }).expr as SchemaExpr;
}

export function generateMapShapes(
  ctx: CodeGenContext,
  shapes: MapShapeEntry[],
): void {
  for (const { key, shape } of shapes) {
    const { name } = ctx.parseShapeKey(key);
    const fileKey = ctx.getOutputFile(key);
    const schemaName = `${camelCase(name)}Schema`;

    const keySchemaExpr = resolveMapKeySchemaExpr(
      ctx,
      name,
      shape.key.target,
      fileKey,
      key,
    );
    const valueSchemaExpr = resolveMapValueSchemaExpr(
      ctx,
      shape.value.target,
      fileKey,
      key,
    );

    const schemaCode = code`export const ${def(schemaName)} = ${zImp}.record(${keySchemaExpr}, ${valueSchemaExpr});`;

    ctx.addCode(fileKey, schemaCode);
  }
}

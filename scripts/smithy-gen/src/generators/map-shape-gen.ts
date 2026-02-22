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

interface BuiltinTargetResolution {
  expr: SchemaExpr;
  stringCompatible: boolean;
}

function resolveBuiltinTarget(
  target: string,
): BuiltinTargetResolution | undefined {
  switch (target) {
    case "smithy.api#String":
      return { expr: code`${zImp}.string()`, stringCompatible: true };
    case "smithy.api#Boolean":
      return { expr: code`${zImp}.boolean()`, stringCompatible: false };
    case "smithy.api#Integer":
      return { expr: code`${zImp}.number()`, stringCompatible: false };
    case "smithy.api#Long":
      return { expr: code`${zImp}.bigint()`, stringCompatible: false };
    case "smithy.api#Blob":
      return {
        expr: code`${zImp}.instanceof(Uint8Array)`,
        stringCompatible: false,
      };
    case "smithy.api#Timestamp":
      return { expr: code`${zImp}.string()`, stringCompatible: false };
    case "smithy.api#Document":
      return { expr: code`${zImp}.unknown()`, stringCompatible: false };
    case "smithy.api#Unit":
      return { expr: code`${zImp}.unknown()`, stringCompatible: false };
    default:
      return undefined;
  }
}

function resolveRegisteredShapeExpr(
  ctx: CodeGenContext,
  shapeTarget: string,
  fileKey: string,
): SchemaExpr {
  const { name: targetName } = ctx.parseShapeKey(shapeTarget);
  const targetSchemaName = `${camelCase(targetName)}Schema`;
  const targetFileKey = ctx.getOutputFile(shapeTarget);
  return targetFileKey === fileKey
    ? targetSchemaName
    : imp(`${targetSchemaName}@${ctx.getImportPath(targetFileKey)}`);
}

function resolveMapKeySchemaExpr(
  ctx: CodeGenContext,
  shapeName: string,
  keyTarget: string,
  fileKey: string,
): SchemaExpr {
  if (ctx.hasRegisteredShape(keyTarget)) {
    const keyTargetType = ctx.getShapeType(keyTarget);
    if (keyTargetType !== "string" && keyTargetType !== "enum") {
      throw new Error(
        `Map ${shapeName} key target ${keyTarget} is not string-compatible.`,
      );
    }
    return resolveRegisteredShapeExpr(ctx, keyTarget, fileKey);
  }

  const builtin = resolveBuiltinTarget(keyTarget);
  if (!builtin) {
    throw new Error(
      `Map ${shapeName} key target ${keyTarget} is not generated yet.`,
    );
  }
  if (!builtin.stringCompatible) {
    throw new Error(
      `Map ${shapeName} key target ${keyTarget} is not string-compatible.`,
    );
  }

  return builtin.expr;
}

function resolveMapValueSchemaExpr(
  ctx: CodeGenContext,
  valueTarget: string,
  fileKey: string,
): { expr: SchemaExpr; unresolvedComment?: string } {
  if (ctx.hasRegisteredShape(valueTarget)) {
    return { expr: resolveRegisteredShapeExpr(ctx, valueTarget, fileKey) };
  }

  const builtin = resolveBuiltinTarget(valueTarget);
  if (builtin) {
    return { expr: builtin.expr };
  }

  return {
    expr: code`${zImp}.unknown()`,
    unresolvedComment: `// TODO: map value target ${valueTarget} is not generated yet.`,
  };
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
    );
    const { expr: valueSchemaExpr, unresolvedComment } =
      resolveMapValueSchemaExpr(ctx, shape.value.target, fileKey);

    const commentPrefix = unresolvedComment ? `${unresolvedComment}\n` : "";
    const schemaCode = code`${commentPrefix}export const ${def(schemaName)} = ${zImp}.record(${keySchemaExpr}, ${valueSchemaExpr});`;

    ctx.addCode(fileKey, schemaCode);
    ctx.registerShape(key, imp(`${schemaName}@${ctx.getImportPath(fileKey)}`));
  }
}

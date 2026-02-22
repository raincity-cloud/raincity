import { camelCase, upperFirst } from "lodash-es";
import { code, imp } from "ts-poet";
import type {
  CodeGenContext,
  OperationMethodSignature,
} from "../codegen-context.js";
import type { OperationShape } from "../shapes/operation-shape.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";
import { buildSchemaDocumentationComment } from "./schema-documentation-comment.js";

interface OperationShapeEntry {
  key: string;
  shape: OperationShape;
}

type ShapeRef = string | ReturnType<typeof imp> | ReturnType<typeof code>;

interface TypeResolution {
  typeExpr: ShapeRef;
  typeName: string;
}

interface ThrowsEntry {
  typeName: string;
  description: string;
}

function pascalCase(value: string): string {
  return upperFirst(camelCase(value));
}

function resolveTypeReference(
  ctx: CodeGenContext,
  target: string,
  fileKey: string,
  stack = new Set<string>(),
): TypeResolution {
  const builtinType = resolveBuiltinTypeReference(target);
  if (builtinType) {
    return builtinType;
  }

  if (!ctx.hasRegisteredShape(target)) {
    return {
      typeExpr: "unknown",
      typeName: "unknown",
    };
  }

  if (stack.has(target)) {
    return {
      typeExpr: "unknown",
      typeName: "unknown",
    };
  }
  stack.add(target);

  const { name: targetName } = ctx.parseShapeKey(target);
  const targetShapeType = ctx.getShapeType(target);
  if (targetShapeType === "structure") {
    const typeName = pascalCase(targetName);
    return resolveNamedTypeReference(ctx, target, fileKey, typeName);
  }

  if (targetShapeType === "enum") {
    return resolveNamedTypeReference(ctx, target, fileKey, pascalCase(targetName));
  }

  if (targetShapeType === "string" || targetShapeType === "timestamp") {
    return { typeExpr: "string", typeName: targetName };
  }

  if (targetShapeType === "boolean") {
    return { typeExpr: "boolean", typeName: targetName };
  }

  if (targetShapeType === "integer") {
    return { typeExpr: "number", typeName: targetName };
  }

  if (targetShapeType === "long") {
    return { typeExpr: "bigint", typeName: targetName };
  }

  if (targetShapeType === "blob") {
    return { typeExpr: "Uint8Array", typeName: targetName };
  }

  if (targetShapeType === "document") {
    return { typeExpr: "unknown", typeName: targetName };
  }

  if (targetShapeType === "list") {
    const listShape = ctx.getShape(target);
    if (listShape?.type !== "list") {
      return { typeExpr: "unknown", typeName: targetName };
    }
    const memberType = resolveTypeReference(
      ctx,
      listShape.member.target,
      fileKey,
      stack,
    );
    return {
      typeExpr: code`Array<${memberType.typeExpr}>`,
      typeName: targetName,
    };
  }

  if (targetShapeType === "map") {
    const mapShape = ctx.getShape(target);
    if (mapShape?.type !== "map") {
      return { typeExpr: "unknown", typeName: targetName };
    }
    const valueType = resolveTypeReference(
      ctx,
      mapShape.value.target,
      fileKey,
      stack,
    );
    return {
      typeExpr: code`Record<string, ${valueType.typeExpr}>`,
      typeName: targetName,
    };
  }

  if (targetShapeType === "union") {
    const unionShape = ctx.getShape(target);
    if (unionShape?.type !== "union") {
      return { typeExpr: "unknown", typeName: targetName };
    }
    const memberTypes = Object.values(unionShape.members).map((member) =>
      resolveTypeReference(ctx, member.target, fileKey, stack).typeExpr,
    );
    if (memberTypes.length === 0) {
      return { typeExpr: "unknown", typeName: targetName };
    }
    return {
      typeExpr: code`${memberTypes[0]}${memberTypes
        .slice(1)
        .map((memberType) => code` | ${memberType}`)}`,
      typeName: targetName,
    };
  }

  return { typeExpr: "unknown", typeName: targetName };
}

function resolveBuiltinTypeReference(
  target: string,
): TypeResolution | undefined {
  switch (target) {
    case "smithy.api#String":
    case "smithy.api#Timestamp":
      return { typeExpr: "string", typeName: "string" };
    case "smithy.api#Boolean":
      return { typeExpr: "boolean", typeName: "boolean" };
    case "smithy.api#Integer":
      return { typeExpr: "number", typeName: "number" };
    case "smithy.api#Long":
      return { typeExpr: "bigint", typeName: "bigint" };
    case "smithy.api#Blob":
      return { typeExpr: "Uint8Array", typeName: "Uint8Array" };
    case "smithy.api#Document":
    case "smithy.api#Unit":
      return { typeExpr: "unknown", typeName: "unknown" };
    default:
      return undefined;
  }
}

function resolveNamedTypeReference(
  ctx: CodeGenContext,
  target: string,
  fileKey: string,
  typeName: string,
): TypeResolution {
  const targetFileKey = ctx.getOutputFile(target);
  return {
    typeExpr:
      targetFileKey === fileKey
        ? typeName
        : imp(`t:${typeName}@${ctx.getImportPath(targetFileKey)}`),
    typeName,
  };
}

function getShapeDocumentation(
  shape: SmithyAstModel["shapes"][string] | undefined,
): string | undefined {
  const traits = (shape as { traits?: unknown } | undefined)?.traits;
  if (!hasDocumentationTrait(traits)) {
    return undefined;
  }

  const documentation = traits["smithy.api#documentation"];
  if (typeof documentation !== "string") {
    return undefined;
  }

  const trimmed = documentation.trim();
  return trimmed ? trimmed : undefined;
}

function hasDocumentationTrait(
  value: unknown,
): value is { "smithy.api#documentation"?: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    "smithy.api#documentation" in value
  );
}

function buildThrowsEntries(
  ctx: CodeGenContext,
  shape: OperationShape,
): ThrowsEntry[] {
  if (!shape.errors) {
    return [];
  }

  return shape.errors.map(({ target }) => {
    const resolved = resolveTypeReference(ctx, target, "");
    if (resolved.typeName === "unknown") {
      return {
        typeName: "unknown",
        description: `This operation may throw an unknown error type (${target}).`,
      };
    }

    const targetShape = ctx.getShape(target);
    const shapeDocumentation = getShapeDocumentation(targetShape);
    return {
      typeName: resolved.typeName,
      description:
        shapeDocumentation ?? `This operation may throw ${resolved.typeName}.`,
    };
  });
}

function buildOperationTsDoc(
  documentation: string | undefined,
  throwsEntries: ThrowsEntry[],
): string | undefined {
  if (throwsEntries.length === 0) {
    return buildSchemaDocumentationComment(documentation);
  }

  const throwsLines = throwsEntries.map(
    (entry) =>
      ` * @throws {${entry.typeName}} ${entry.description.replaceAll("*/", "*\\/")}`,
  );

  const trimmed = documentation?.trim();
  if (!trimmed) {
    return ["/**", ...throwsLines, " */"].join("\n");
  }

  const docLines = trimmed.split(/\r?\n/);
  return [
    "/**",
    " * ```xml",
    ...docLines.map((line) => (line ? ` * ${line}` : " *")),
    " * ```",
    " *",
    ...throwsLines,
    " */",
  ].join("\n");
}

export function generateOperationShapes(
  ctx: CodeGenContext,
  shapes: OperationShapeEntry[],
): void {
  for (const { key, shape } of shapes) {
    const { name } = ctx.parseShapeKey(key);
    const fileKey = ctx.getOutputFile(key);
    const operationName = camelCase(name);

    const inputType = resolveTypeReference(ctx, shape.input.target, fileKey);
    const outputType = resolveTypeReference(ctx, shape.output.target, fileKey);
    const throwsEntries = buildThrowsEntries(ctx, shape);
    const documentation = shape.traits?.["smithy.api#documentation"];
    const tsDoc = buildOperationTsDoc(documentation, throwsEntries);

    const signature: OperationMethodSignature = {
      methodName: operationName,
      inputTypeExpr: inputType.typeExpr,
      outputTypeExpr: outputType.typeExpr,
      ...(tsDoc ? { tsDoc } : {}),
    };
    ctx.registerOperationMethod(key, signature);
  }
}

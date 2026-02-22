import { camelCase } from "lodash-es";
import { code, imp } from "ts-poet";
import type { CodeGenContext } from "../codegen-context.js";
import type { OperationShape } from "../shapes/operation-shape.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";

const zImp = imp("z@zod/v4");

interface OperationShapeEntry {
  key: string;
  shape: OperationShape;
}

type ShapeRef = string | ReturnType<typeof imp> | ReturnType<typeof code>;

interface TypeResolution {
  typeExpr: ShapeRef;
  typeName: string;
  unresolvedTarget?: string;
}

interface ThrowsEntry {
  typeName: string;
  description: string;
}

function resolveTypeReference(
  ctx: CodeGenContext,
  target: string,
  fileKey: string,
): TypeResolution {
  if (!ctx.hasRegisteredShape(target)) {
    return {
      typeExpr: "unknown",
      typeName: "unknown",
      unresolvedTarget: target,
    };
  }

  const { name: targetName } = ctx.parseShapeKey(target);
  const targetSchemaName = `${camelCase(targetName)}Schema`;
  const targetFileKey = ctx.getOutputFile(target);
  const schemaRef =
    targetFileKey === fileKey
      ? targetSchemaName
      : imp(`${targetSchemaName}@./${targetFileKey}`);

  return {
    typeExpr: code`${zImp}.infer<typeof ${schemaRef}>`,
    typeName: targetName,
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
    if (resolved.unresolvedTarget) {
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
  const lines: string[] = [];

  if (documentation) {
    const safeDocumentation = documentation.trim().replaceAll("*/", "*\\/");
    lines.push(...safeDocumentation.split(/\r?\n/u));
  }

  if (throwsEntries.length > 0) {
    if (lines.length > 0) {
      lines.push("");
    }

    for (const entry of throwsEntries) {
      const safeDescription = entry.description.replaceAll("*/", "*\\/");
      lines.push(`@throws {${entry.typeName}} ${safeDescription}`);
    }
  }

  if (lines.length === 0) {
    return undefined;
  }

  if (lines.length === 1) {
    return `/** ${lines[0]} */`;
  }

  return [
    "/**",
    ...lines.map((line) => (line ? ` * ${line}` : " *")),
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
    const tsDocPrefix = tsDoc ? `${tsDoc}\n` : "";

    const operationCode = code`${tsDocPrefix}export function ${operationName}(_input: ${inputType.typeExpr}): ${outputType.typeExpr} {
  throw new Error("Operation ${name} is not implemented.");
}`;

    ctx.addCode(fileKey, operationCode);
  }
}

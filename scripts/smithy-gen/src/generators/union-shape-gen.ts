import { camelCase } from "lodash-es";
import { code, def, imp, joinCode } from "ts-poet";
import type { CodeGenContext } from "../codegen-context.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";

const zImp = imp("z@zod/v4");

interface UnionShapeEntry {
  key: string;
  shape: UnionShape;
}

type UnionShape = Extract<SmithyAstModel["shapes"][string], { type: "union" }>;
type SchemaExpr = ReturnType<typeof code>;

function resolveBuiltinTarget(target: string): SchemaExpr | undefined {
  switch (target) {
    case "smithy.api#String":
      return code`${zImp}.string()`;
    case "smithy.api#Boolean":
      return code`${zImp}.boolean()`;
    case "smithy.api#Integer":
      return code`${zImp}.number()`;
    case "smithy.api#Long":
      return code`${zImp}.bigint()`;
    case "smithy.api#Blob":
      return code`${zImp}.instanceof(Uint8Array)`;
    case "smithy.api#Timestamp":
      return code`${zImp}.string()`;
    case "smithy.api#Document":
    case "smithy.api#Unit":
      return code`${zImp}.unknown()`;
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
  const importPath = ctx.getImportPath(targetFileKey);
  return targetFileKey === fileKey
    ? code`${targetSchemaName}`
    : code`${imp(`${targetSchemaName}@${importPath}`)}`;
}

export function generateUnionShapes(
  ctx: CodeGenContext,
  shapes: UnionShapeEntry[],
): void {
  for (const { key, shape } of shapes) {
    const { name } = ctx.parseShapeKey(key);
    const fileKey = ctx.getOutputFile(key);
    const schemaName = `${camelCase(name)}Schema`;

    const memberSchemaExprs: SchemaExpr[] = [];
    const unresolvedTargetComments: string[] = [];
    for (const [memberName, member] of Object.entries(shape.members)) {
      const memberTarget = member.target;
      if (ctx.hasRegisteredShape(memberTarget)) {
        memberSchemaExprs.push(
          resolveRegisteredShapeExpr(ctx, memberTarget, fileKey),
        );
        continue;
      }

      const builtinExpr = resolveBuiltinTarget(memberTarget);
      if (builtinExpr) {
        memberSchemaExprs.push(builtinExpr);
        continue;
      }

      unresolvedTargetComments.push(
        `// TODO: union member target ${memberTarget} for ${name}.${memberName} is not generated yet.`,
      );
      memberSchemaExprs.push(code`${zImp}.unknown()`);
    }

    const unionMembersCode = joinCode(memberSchemaExprs, { on: ", " });
    const commentPrefix =
      unresolvedTargetComments.length > 0
        ? `${unresolvedTargetComments.join("\n")}\n`
        : "";
    const schemaCode = code`${commentPrefix}export const ${def(schemaName)} = ${zImp}.union([${unionMembersCode}]);`;

    ctx.addCode(fileKey, schemaCode);
    ctx.registerShape(key, imp(`${schemaName}@${ctx.getImportPath(fileKey)}`));
  }
}

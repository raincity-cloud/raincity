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

export function generateUnionShapes(
  ctx: CodeGenContext,
  shapes: UnionShapeEntry[],
): void {
  for (const { key, shape } of shapes) {
    const { name } = ctx.parseShapeKey(key);
    const fileKey = ctx.getOutputFile(key);
    const schemaName = `${camelCase(name)}Schema`;

    const memberSchemaExprs: SchemaExpr[] = [];
    for (const member of Object.values(shape.members)) {
      memberSchemaExprs.push(
        code`${
          ctx.resolveSchemaReference(member.target, fileKey, {
            currentShapeKey: key,
            lazyForSameFile: true,
          }).expr
        }`,
      );
    }

    const unionMembersCode = joinCode(memberSchemaExprs, { on: ", " });
    const schemaCode = code`export const ${def(schemaName)} = ${zImp}.union([${unionMembersCode}]);`;

    ctx.addCode(fileKey, schemaCode);
  }
}

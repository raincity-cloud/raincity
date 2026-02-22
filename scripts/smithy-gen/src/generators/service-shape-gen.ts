import { camelCase } from "lodash-es";
import { code, def, joinCode } from "ts-poet";
import type { CodeGenContext } from "../codegen-context.js";
import type { ServiceShape } from "../shapes/service-shape.js";
import { buildSchemaDocumentationComment } from "./schema-documentation-comment.js";

interface ServiceShapeEntry {
  key: string;
  shape: ServiceShape;
}

function buildFallbackMethodName(target: string): string {
  const hashIndex = target.indexOf("#");
  if (hashIndex === -1) {
    return camelCase(target);
  }
  return camelCase(target.slice(hashIndex + 1));
}

export function generateServiceShapes(
  ctx: CodeGenContext,
  shapes: ServiceShapeEntry[],
): void {
  for (const { key, shape } of shapes) {
    const { name } = ctx.parseShapeKey(key);
    const fileKey = ctx.getOutputFile(key);
    const interfaceName = `${name}Service`;
    const serviceDoc = buildSchemaDocumentationComment(
      shape.traits?.["smithy.api#documentation"],
    );
    const serviceDocPrefix = serviceDoc ? `${serviceDoc}\n` : "";

    const methods = shape.operations.map((operationReference) => {
      const operationTarget = operationReference.target;
      const operationMethod = ctx.getOperationMethod(operationTarget);

      if (!operationMethod) {
        const methodName = buildFallbackMethodName(operationTarget);
        return code`// TODO: operation target ${operationTarget} is not generated.
${methodName}(input: unknown): unknown;`;
      }

      const commentPrefix = operationMethod.unresolvedComment
        ? `${operationMethod.unresolvedComment}\n`
        : "";
      const tsDocPrefix = operationMethod.tsDoc
        ? `${operationMethod.tsDoc}\n`
        : "";
      return code`${commentPrefix}${tsDocPrefix}${operationMethod.methodName}(input: ${operationMethod.inputTypeExpr}): ${operationMethod.outputTypeExpr};`;
    });

    const interfaceCode =
      methods.length > 0
        ? code`${serviceDocPrefix}export interface ${def(interfaceName)} {
  ${joinCode(methods, { on: "\n  " })}
}`
        : code`${serviceDocPrefix}export interface ${def(interfaceName)} {}`;

    ctx.addCode(fileKey, interfaceCode);
  }
}

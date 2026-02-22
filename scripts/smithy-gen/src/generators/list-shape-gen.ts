import { camelCase } from "lodash-es";
import { code, def, imp } from "ts-poet";
import type { CodeGenContext } from "../codegen-context.js";
import type { ListShape } from "../shapes/list-shape.js";
import { buildSchemaDocumentationComment } from "./schema-documentation-comment.js";

const zImp = imp("z@zod/v4");

interface ListShapeEntry {
  key: string;
  shape: ListShape;
}

export function buildConstraintChain(traits: ListShape["traits"]): string {
  if (!traits) return "";

  const parts: string[] = [];

  const length = traits["smithy.api#length"];
  if (length) {
    if (length.min !== undefined) {
      parts.push(`.min(${String(length.min)})`);
    }
    if (length.max !== undefined) {
      parts.push(`.max(${String(length.max)})`);
    }
  }

  if (traits["smithy.api#uniqueItems"] !== undefined) {
    parts.push(`.superRefine((items, refinementContext) => {
  const seen = new Map<string, number>();
  for (let index = 0; index < items.length; index += 1) {
    const serialized = JSON.stringify(items[index]);
    const key = serialized === undefined ? "__undefined__" : serialized;
    const previousIndex = seen.get(key);
    if (previousIndex !== undefined) {
      refinementContext.addIssue({
        code: "custom",
        message: "Duplicate items are not allowed.",
        path: [index],
      });
      return;
    }
    seen.set(key, index);
  }
})`);
  }

  return parts.join("");
}

export function generateListShapes(
  ctx: CodeGenContext,
  shapes: ListShapeEntry[],
): void {
  for (const { key, shape } of shapes) {
    const { name } = ctx.parseShapeKey(key);
    const fileKey = ctx.getOutputFile(key);
    const schemaName = `${camelCase(name)}Schema`;
    const memberTarget = shape.member.target;
    const memberDocumentation = buildSchemaDocumentationComment(
      shape.member.traits?.["smithy.api#documentation"],
    );
    const memberXmlName = shape.member.traits?.["smithy.api#xmlName"];
    const listConstraints = buildConstraintChain(shape.traits);

    let memberSchemaExpr:
      | string
      | ReturnType<typeof imp>
      | ReturnType<typeof code> = code`${zImp}.unknown()`;
    let unresolvedTargetComment: string | undefined;
    if (ctx.hasRegisteredShape(memberTarget)) {
      const { name: memberTargetName } = ctx.parseShapeKey(memberTarget);
      const memberTargetSchemaName = `${camelCase(memberTargetName)}Schema`;
      const memberTargetFileKey = ctx.getOutputFile(memberTarget);
      memberSchemaExpr =
        memberTargetFileKey === fileKey
          ? memberTargetSchemaName
          : imp(
              `${memberTargetSchemaName}@${ctx.getImportPath(memberTargetFileKey)}`,
            );
    } else {
      unresolvedTargetComment = `// TODO: list member target ${memberTarget} is not generated yet.`;
    }

    const shapeDocumentation = buildSchemaDocumentationComment(
      shape.traits?.["smithy.api#documentation"],
    );
    const memberCommentLines: string[] = [];
    if (memberDocumentation) {
      memberCommentLines.push(memberDocumentation);
    }
    if (memberXmlName) {
      memberCommentLines.push(
        `// TODO: smithy.api#xmlName (${JSON.stringify(memberXmlName)}) on list member is not mapped to zod.`,
      );
    }
    if (unresolvedTargetComment) {
      memberCommentLines.push(unresolvedTargetComment);
    }
    const memberComments =
      memberCommentLines.length > 0 ? `${memberCommentLines.join("\n")}\n` : "";
    const shapeDocPrefix = shapeDocumentation ? `${shapeDocumentation}\n` : "";

    const schemaCode = code`${memberComments}${shapeDocPrefix}export const ${def(schemaName)} = ${zImp}.array(${memberSchemaExpr})${listConstraints};`;

    ctx.addCode(fileKey, schemaCode);
    ctx.registerShape(key, imp(`${schemaName}@${ctx.getImportPath(fileKey)}`));
  }
}

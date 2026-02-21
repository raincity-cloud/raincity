import { camelCase } from "lodash-es";
import { code, def, imp } from "ts-poet";
import type { CodeGenContext } from "../codegen-context.js";
import type { StringShape } from "../shapes/string-shape.js";
import { buildSchemaDocumentationComment } from "./schema-documentation-comment.js";

const zImp = imp("z@zod/v4");

interface StringShapeEntry {
  key: string;
  shape: StringShape;
}

export function buildConstraintChain(traits: StringShape["traits"]): string {
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

  const pattern = traits["smithy.api#pattern"];
  if (pattern) {
    parts.push(`.regex(new RegExp(${JSON.stringify(pattern)}))`);
  }

  return parts.join("");
}

export function generateStringShapes(
  ctx: CodeGenContext,
  shapes: StringShapeEntry[],
): void {
  for (const { key, shape } of shapes) {
    const { name } = ctx.parseShapeKey(key);
    const fileKey = ctx.getOutputFile(key);
    const schemaName = `${camelCase(name)}Schema`;

    const constraints = buildConstraintChain(shape.traits);
    const documentationComment = buildSchemaDocumentationComment(
      shape.traits?.["smithy.api#documentation"],
    );
    const schemaCode = documentationComment
      ? code`${documentationComment}
export const ${def(schemaName)} = ${zImp}.string()${constraints};`
      : code`export const ${def(schemaName)} = ${zImp}.string()${constraints};`;

    ctx.addCode(fileKey, schemaCode);
    ctx.registerShape(key, imp(`${schemaName}@./${fileKey}`));
  }
}

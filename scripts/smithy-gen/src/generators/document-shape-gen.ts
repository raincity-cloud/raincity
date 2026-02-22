import { camelCase } from "lodash-es";
import { code, def, imp } from "ts-poet";
import type { CodeGenContext } from "../codegen-context.js";
import type { DocumentShape } from "../shapes/document-shape.js";
import { buildSchemaDocumentationComment } from "./schema-documentation-comment.js";

const zImp = imp("z@zod/v4");

interface DocumentShapeEntry {
  key: string;
  shape: DocumentShape;
}

export function generateDocumentShapes(
  ctx: CodeGenContext,
  shapes: DocumentShapeEntry[],
): void {
  for (const { key, shape } of shapes) {
    const { name } = ctx.parseShapeKey(key);
    const fileKey = ctx.getOutputFile(key);
    const schemaName = `${camelCase(name)}Schema`;

    const documentationComment = buildSchemaDocumentationComment(
      shape.traits?.["smithy.api#documentation"],
    );
    const schemaCode = documentationComment
      ? code`${documentationComment}
export const ${def(schemaName)} = ${zImp}.unknown();`
      : code`export const ${def(schemaName)} = ${zImp}.unknown();`;

    ctx.addCode(fileKey, schemaCode);
  }
}

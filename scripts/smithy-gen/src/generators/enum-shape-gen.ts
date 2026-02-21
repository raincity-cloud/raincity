import { camelCase } from "lodash-es";
import { code, def, imp } from "ts-poet";
import type { CodeGenContext } from "../codegen-context.js";
import type { EnumShape } from "../shapes/enum-shape.js";
import { buildSchemaDocumentationComment } from "./schema-documentation-comment.js";

const zImp = imp("z@zod/v4");

interface EnumShapeEntry {
  key: string;
  shape: EnumShape;
}

function buildMemberName(memberName: string): string {
  if (/^[$A-Z_a-z][$\w]*$/u.test(memberName)) {
    return memberName;
  }
  return JSON.stringify(memberName);
}

export function generateEnumShapes(
  ctx: CodeGenContext,
  shapes: EnumShapeEntry[],
): void {
  for (const { key, shape } of shapes) {
    const { name } = ctx.parseShapeKey(key);
    const fileKey = ctx.getOutputFile(key);
    const enumName = name;
    const schemaName = `${camelCase(name)}Schema`;

    const memberLines: string[] = [];
    for (const [memberName, member] of Object.entries(shape.members)) {
      const memberDocumentation = buildSchemaDocumentationComment(
        member.traits?.["smithy.api#documentation"],
      );
      if (memberDocumentation) {
        memberLines.push(memberDocumentation);
      }

      const enumValue = member.traits?.["smithy.api#enumValue"] ?? memberName;
      memberLines.push(
        `${buildMemberName(memberName)} = ${JSON.stringify(enumValue)},`,
      );
    }

    const enumDocumentation = buildSchemaDocumentationComment(
      shape.traits?.["smithy.api#documentation"],
    );
    const enumCodeBody = `export enum ${enumName} {\n${memberLines
      .map((line) => `  ${line}`)
      .join("\n")}\n}`;
    const enumCode = enumDocumentation
      ? `${enumDocumentation}\n${enumCodeBody}`
      : enumCodeBody;

    const schemaCode = code`${enumCode}
export const ${def(schemaName)} = ${zImp}.enum(${enumName});`;

    ctx.addCode(fileKey, schemaCode);
    ctx.registerShape(key, imp(`${schemaName}@./${fileKey}`));
  }
}

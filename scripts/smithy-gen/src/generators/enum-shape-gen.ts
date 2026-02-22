import { camelCase, upperFirst } from "lodash-es";
import { code } from "ts-poet";
import type { CodeGenContext } from "../codegen-context.js";
import type { EnumShape } from "../shapes/enum-shape.js";
import { buildSchemaDocumentationComment } from "./schema-documentation-comment.js";

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

function pascalCase(value: string): string {
  return upperFirst(camelCase(value));
}

export function generateEnumShapes(
  ctx: CodeGenContext,
  shapes: EnumShapeEntry[],
): void {
  for (const { key, shape } of shapes) {
    const { name } = ctx.parseShapeKey(key);
    const fileKey = ctx.getOutputFile(key);
    const enumName = pascalCase(name);

    const memberLines: string[] = [];
    for (const [memberName, member] of Object.entries(shape.members)) {
      const memberDocumentation = buildSchemaDocumentationComment(
        member.traits?.["smithy.api#documentation"],
      );
      if (memberDocumentation) {
        memberLines.push(memberDocumentation);
      }

      const enumValue = member.traits?.["smithy.api#enumValue"] ?? memberName;
      const enumMemberName = pascalCase(memberName);
      memberLines.push(
        `${buildMemberName(enumMemberName)} = ${JSON.stringify(enumValue)},`,
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

    const schemaCode = code`${enumCode}`;

    ctx.addCode(fileKey, schemaCode);
  }
}

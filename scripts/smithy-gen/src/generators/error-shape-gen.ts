import { camelCase, upperFirst } from "lodash-es";
import { code, def, imp } from "ts-poet";
import type { CodeGenContext } from "../codegen-context.js";
import type { StructureShape } from "../shapes/structure-shape.js";

interface ErrorShapeEntry {
  key: string;
  shape: StructureShape;
}

function pascalCase(value: string): string {
  return upperFirst(camelCase(value));
}

const awsErrorImp = imp("AwsError@@raincity/aws-api-shared");

export function generateErrorShapes(
  ctx: CodeGenContext,
  shapes: ErrorShapeEntry[],
): void {
  for (const { key, shape } of shapes) {
    const { name } = ctx.parseShapeKey(key);
    const fileKey = ctx.getOutputFile(key);
    const className = `${pascalCase(name)}Error`;

    const errorCode = JSON.stringify(name);
    const documentation = shape.traits?.["smithy.api#documentation"];
    const message =
      documentation !== undefined ? JSON.stringify(documentation) : "undefined";
    const httpStatus = shape.traits?.["smithy.api#httpError"];
    const httpStatusLiteral =
      httpStatus !== undefined ? String(httpStatus) : "undefined";

    const classCode = code`export class ${def(className)} extends ${awsErrorImp} {
  constructor() {
    super(${errorCode}, ${message}, ${httpStatusLiteral});
    this.name = ${JSON.stringify(className)};
  }
}`;

    ctx.addCode(fileKey, classCode);
  }
}

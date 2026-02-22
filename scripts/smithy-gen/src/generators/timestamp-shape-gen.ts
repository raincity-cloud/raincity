import { camelCase } from "lodash-es";
import { code, def, Import } from "ts-poet";
import type { CodeGenContext } from "../codegen-context.js";
import type { TimestampShape } from "../shapes/timestamp-shape.js";

interface TimestampShapeEntry {
  key: string;
  shape: TimestampShape;
}

type TimestampFormat = NonNullable<
  TimestampShape["traits"]
>["smithy.api#timestampFormat"];

function buildTimestampSchemaImport(
  fileKey: string,
  format: NonNullable<TimestampFormat>,
): Import {
  const helperPath = fileKey.startsWith("common-schemas:")
    ? "../timestamp-schema-helpers.js"
    : "@raincity/aws-api-shared";
  const schemaName =
    format === "date-time"
      ? "rfc3339DateTimeTimestampSchema"
      : "imfFixdateTimestampSchema";

  return Import.importsName(schemaName, helperPath, false);
}

function resolveTimestampFormatForFile(
  format: TimestampFormat,
  fileKey: string,
): NonNullable<TimestampFormat> {
  if (format) {
    return format;
  }

  if (
    fileKey.startsWith("s3-schemas:") ||
    fileKey.startsWith("common-schemas:")
  ) {
    return "date-time";
  }

  return "http-date";
}

export function generateTimestampShapes(
  ctx: CodeGenContext,
  shapes: TimestampShapeEntry[],
): void {
  for (const { key, shape } of shapes) {
    const { name } = ctx.parseShapeKey(key);
    const fileKey = ctx.getOutputFile(key);
    const schemaName = `${camelCase(name)}Schema`;
    const format = resolveTimestampFormatForFile(
      shape.traits?.["smithy.api#timestampFormat"],
      fileKey,
    );
    const timestampSchema = buildTimestampSchemaImport(fileKey, format);

    const schemaCode = code`export const ${def(schemaName)} = ${timestampSchema};`;

    ctx.addCode(fileKey, schemaCode);
  }
}

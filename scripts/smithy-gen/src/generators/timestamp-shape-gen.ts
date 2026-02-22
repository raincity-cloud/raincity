import { camelCase } from "lodash-es";
import { code, def, imp } from "ts-poet";
import { z } from "zod/v4";
import type { CodeGenContext } from "../codegen-context.js";
import type { TimestampShape } from "../shapes/timestamp-shape.js";

const zImp = imp("z@zod/v4");

const RFC3339_DATE_TIME_PATTERN =
  "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})$";
const IMF_FIXDATE_PATTERN =
  "^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \\d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \\d{4} \\d{2}:\\d{2}:\\d{2} GMT$";
const FRACTIONAL_TRUNCATION_REGEX = /\.(\d{3})\d+(?=Z|[+-]\d{2}:\d{2}$)/;

interface TimestampShapeEntry {
  key: string;
  shape: TimestampShape;
}

type TimestampFormat = NonNullable<
  TimestampShape["traits"]
>["smithy.api#timestampFormat"];

export function normalizeDateTimeToCanonicalUtc(value: string): string {
  if (!new RegExp(RFC3339_DATE_TIME_PATTERN).test(value)) {
    throw new Error("Invalid RFC3339 date-time timestamp");
  }

  const truncated = value.replace(FRACTIONAL_TRUNCATION_REGEX, ".$1");
  const parsed = new Date(truncated);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid RFC3339 date-time timestamp");
  }

  return parsed.toISOString();
}

export function createTimestampSchemaForFormat(format: TimestampFormat) {
  if (format === "date-time") {
    return z
      .string()
      .regex(new RegExp(RFC3339_DATE_TIME_PATTERN))
      .refine((value) => {
        const truncated = value.replace(FRACTIONAL_TRUNCATION_REGEX, ".$1");
        return !Number.isNaN(new Date(truncated).getTime());
      }, "Invalid RFC3339 date-time timestamp")
      .transform((value) => normalizeDateTimeToCanonicalUtc(value));
  }

  return z
    .string()
    .regex(new RegExp(IMF_FIXDATE_PATTERN))
    .refine((value) => {
      const parsed = new Date(value);
      return !Number.isNaN(parsed.getTime()) && parsed.toUTCString() === value;
    }, "Invalid IMF-fixdate timestamp");
}

export function buildConstraintChain(
  format: NonNullable<TimestampFormat>,
): string {
  if (format === "date-time") {
    const formatPattern = JSON.stringify(RFC3339_DATE_TIME_PATTERN);
    const truncationPattern = "/\\.(\\d{3})\\d+(?=Z|[+-]\\d{2}:\\d{2}$)/";
    return `.regex(new RegExp(${formatPattern})).refine((value) => {
  const truncated = value.replace(${truncationPattern}, ".$1");
  return !Number.isNaN(new Date(truncated).getTime());
}, "Invalid RFC3339 date-time timestamp").transform((value) => {
  const truncated = value.replace(${truncationPattern}, ".$1");
  return new Date(truncated).toISOString();
})`;
  }

  const httpDatePattern = JSON.stringify(IMF_FIXDATE_PATTERN);
  return `.regex(new RegExp(${httpDatePattern})).refine((value) => {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toUTCString() === value;
}, "Invalid IMF-fixdate timestamp")`;
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
    const constraints = buildConstraintChain(format);

    const schemaCode = code`export const ${def(schemaName)} = ${zImp}.string()${constraints};`;

    ctx.addCode(fileKey, schemaCode);
    ctx.registerShape(key, imp(`${schemaName}@${ctx.getImportPath(fileKey)}`));
  }
}

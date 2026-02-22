import { z } from "zod/v4";

export const RFC3339_DATE_TIME_PATTERN =
  "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})$";
export const IMF_FIXDATE_PATTERN =
  "^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \\d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \\d{4} \\d{2}:\\d{2}:\\d{2} GMT$";

const FRACTIONAL_TRUNCATION_REGEX = /\.(\d{3})\d+(?=Z|[+-]\d{2}:\d{2}$)/;

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

export const rfc3339DateTimeTimestampSchema = z
  .string()
  .regex(new RegExp(RFC3339_DATE_TIME_PATTERN))
  .refine((value) => {
    const truncated = value.replace(FRACTIONAL_TRUNCATION_REGEX, ".$1");
    return !Number.isNaN(new Date(truncated).getTime());
  }, "Invalid RFC3339 date-time timestamp")
  .transform((value) => normalizeDateTimeToCanonicalUtc(value));

export const imfFixdateTimestampSchema = z
  .string()
  .regex(new RegExp(IMF_FIXDATE_PATTERN))
  .refine((value) => {
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime()) && parsed.toUTCString() === value;
  }, "Invalid IMF-fixdate timestamp");

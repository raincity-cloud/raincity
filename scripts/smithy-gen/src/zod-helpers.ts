import { z } from "zod/v4";

type InferShape<S extends z.ZodRawShape> = z.infer<z.ZodObject<S>>;

export function withoutRecordKeyPrefixes<V extends z.ZodTypeAny>(
  ignoredPrefixes: ReadonlyArray<string>,
  valueSchema: V,
) {
  return z
    .record(z.string(), z.unknown())
    .transform((raw) =>
      Object.fromEntries(
        Object.entries(raw).filter(
          ([key]) => !ignoredPrefixes.some((p) => key.startsWith(p)),
        ),
      ),
    )
    .pipe(z.record(z.string(), valueSchema));
}

export function withoutObjectKeys<
  S extends z.ZodRawShape,
  Ignored extends readonly string[],
>(ignoredKeys: Ignored, shape: S) {
  const base = z.object(shape).loose();

  const allowed = new Set<string>([...Object.keys(shape), ...ignoredKeys]);

  return base
    .superRefine((obj, ctx) => {
      const unknownKeys = Object.keys(obj).filter((k) => !allowed.has(k));
      if (unknownKeys.length) {
        ctx.addIssue({
          code: "unrecognized_keys",
          keys: unknownKeys,
        });
      }
    })
    .transform((obj): InferShape<S> => {
      // We know obj is an object here (Zod object schema), but TS doesn't know the exact keying.
      const rec = obj as Record<string, unknown>;

      // Build output containing only keys from the shape.
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(shape)) {
        out[k] = rec[k];
      }

      // Safe because every property in shape was validated by base before transform runs.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      return out as InferShape<S>;
    });
}

export const markerObjectSchema = z.object({}).strict();

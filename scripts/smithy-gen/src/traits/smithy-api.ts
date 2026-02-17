import { z } from "zod/v4";
import { markerObjectSchema } from "../zod-helpers.js";

export const documentationTrait = {
  "smithy.api#documentation": z.string().optional(),
};

export const idRefTrait = {
  "smithy.api#idRef": z
    .object({
      failWhenMissing: z.boolean().optional(),
      selector: z.string(),
    })
    .strict()
    .optional(),
};

export const lengthTrait = {
  "smithy.api#length": z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .strict()
    .optional(),
};

export const patternTrait = {
  "smithy.api#pattern": z.string().optional(),
};

export const PRIVATE_TRAIT = "smithy.api#private" as const;

export const rangeTrait = {
  "smithy.api#range": z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .strict(),
};

export const sensitiveTrait = {
  "smithy.api#sensitive": markerObjectSchema.strict().optional(),
};

export const streamingTrait = {
  "smithy.api#streaming": markerObjectSchema.strict().optional(),
};

export const timestampFormatTrait = {
  "smithy.api#timestampFormat": z.enum(["date-time", "http-date"]).optional(),
};

export const traitTrait = {
  "smithy.api#trait": z
    .object({
      selector: z.string(),
      conflicts: z.array(z.string()).optional(),
      breakingChanges: z
        .array(
          z
            .object({
              change: z.enum(["remove", "any", "presence"]),
              severity: z.enum(["DANGER"]).optional(),
              message: z.string().optional(),
              path: z.string().optional(),
            })
            .strict(),
        )
        .optional(),
    })
    .strict()
    .optional(),
};

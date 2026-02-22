import { z } from "zod/v4";
import { markerObjectSchema } from "../zod-helpers.js";

export const sigv4Trait = {
  "aws.auth#sigv4": z
    .object({
      name: z.string(),
    })
    .strict()
    .optional(),
};

export const unsignedPayloadTrait = {
  "aws.auth#unsignedPayload": markerObjectSchema.strict().optional(),
};

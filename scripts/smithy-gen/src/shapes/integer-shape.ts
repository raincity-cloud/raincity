import { z } from "zod/v4";
import { rangeTrait } from "../traits/smithy-api.js";
import { withoutObjectKeys } from "../zod-helpers.js";
import { abstractShapeSchema } from "./abstract-shape.js";

export const integerShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("integer"),
    traits: withoutObjectKeys([], {
      ...rangeTrait,
    }).optional(),
  })
  .strict();

export type IntegerShape = z.infer<typeof integerShapeSchema>;
